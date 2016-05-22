const phantom = require('phantom');
const co = require('co');
const mongoose = require('mongoose');
const _ = require('lodash');

const config = require('./config');

const Schema = mongoose.Schema;


mongoose.connect(config.dbUrl);
const AnswerSchema = new Schema({
    checked: {type: Boolean, default: false},
    correct: {type: Boolean, default: false},
    text: {type: String},
});
const QuestionSchema = new Schema({
    id: String,
    text: String,
    answers: [AnswerSchema],
    correct: {type: Boolean, default: false},
});
const Question = mongoose.model('Question', QuestionSchema);


let ph = null;

const sleep = (time) => new Promise(res => {
    setTimeout(() => {
        res(true);
    }, time)
});

const waitFor = (fn, page) =>  {
    return new Promise((resolve, reject) => {
        var test = () => {
            page.evaluate(fn).then((res) => {
                if (!res) setTimeout(() => test(fn, page), 500);
                if (res) return resolve(res);
            });
        };
        test();
    });
}


const main = co.wrap(function *() {
    ph = yield phantom.create(['--webdriver-loglevel=NONE']);

    const page = yield ph.createPage();
    yield page.open(config.host);
    yield waitFor(function() {
        return !!document.getElementById('login_username');
    }, page);
    yield page.evaluate(function(config) {
        document.getElementById('login_username').value = config.username;
        document.getElementById('login_password').value = config.password;
        document.getElementById('login').submit();
    }, config);
    yield sleep(2000);
    let N = 1000;
    while (N--) {
        yield page.open('https://msn.khnu.km.ua/mod/quiz/view.php?id=198028');
        yield waitFor(function() {
            return !!document.querySelector('form[action="https://msn.khnu.km.ua/mod/quiz/startattempt.php"]');
        }, page);
        yield page.evaluate(function() {
            document.forms[0].submit();
        });
        yield waitFor(function() {
            return !!document.querySelector('.que');
        }, page);

        const questions = yield page.evaluate(function() {
            var questions = [].slice.call(document.getElementsByClassName('que'));
            questions = questions.filter(function(question) {
                return !question.querySelector('input[type="checkbox"]');
            });
            return questions.map(function(question) {
                var id = question.getElementsByClassName('questionflagpostdata')[0].value;
                id = id.slice(id.indexOf('qid=') + 4);
                id = id.slice(0, id.indexOf('&'));
                var answers = [].slice.call(question.querySelectorAll('input[type="radio"][name^="q"]')).map(function(ans) {
                    var text = ans.parentNode.children[1].innerText;
                    return {
                        htmlId: ans.id,
                        text: text.slice(text.indexOf('.') + 1).trim()
                    };
                });
                var questionText = question.querySelector('.qtext').innerText.trim();
                return {
                    id: id,
                    text: questionText,
                    answers: answers
                };
            });
        });

        if (_.isEmpty(questions)) {
            continue;
        }
        for (let q of questions) {
            const question = yield Question.findOne({id: q.id});
            if (!question) {
                const result = yield Question.create(Object.assign({}, q, {
                    answers: q.answers.map(x => {
                        return {
                            text: x.text,
                            checked: false,
                            correct: false,
                        };
                    }),
                }));
            }
        }
        const qIds = _.map(questions, 'id');
        const questionToCheck = yield Question.findOne({id: {'$in': qIds}, correct: false});
        const localQuestion = _.find(questions, {'id': questionToCheck.id});
        // console.log(localQuestion);
        const answerToCheck = _.find(questionToCheck.answers, {checked: false});
        // console.log(answerToCheck);
        // console.log(localQuestion.answers);
        const optionIdToCheck = _.find(localQuestion.answers, {text: answerToCheck.text}).htmlId;
        // console.log(optionIdToCheck);

        yield page.evaluate(function(id) {
            document.getElementById(id).checked = true;
            document.querySelector('input[type="submit"]').click();
        }, optionIdToCheck);
        yield waitFor(function() {
            return !!document.querySelector('input[id^="single"]');
        }, page);
        yield page.evaluate(function() {
            document.querySelector('input[id^="single"]').click();
        });

        yield waitFor(function() {
            return !!document.querySelector('input[id^="id_yuiconfirmyes"]');
        }, page);
        yield page.evaluate(function() {
            document.querySelector('input[id^="id_yuiconfirmyes"]').click();
        });

        yield waitFor(function() {
            return !!document.querySelector('.lastrow .c2');
        }, page);
        const result = yield page.evaluate(function() {
            return document.querySelector('.lastrow .c2').innerText !== "0";
        });
        if (result == null) {
            continue;
        }
        console.log(questionToCheck);
        console.log(answerToCheck);
        console.log('Result: ', result, '      ', N + ' left');
        const dataToUpdate = {
            '$set': {
                'answers.$.correct': result,
                'answers.$.checked': true,
                'correct': result,
            }
        }
        yield Question.update({'answers._id': answerToCheck._id}, dataToUpdate);
    }
    yield Promise.resolve(true);
});

main().then(() => {
    mongoose.disconnect();
    ph.exit();
}).catch(() => {
    mongoose.disconnect();
    ph.exit();
});

process.on('SIGINT', () => {
    mongoose.disconnect();
    ph.exit();
    console.log('Bye :)');
    process.exit();
});


/*
    db.getCollection('questions').update(
        {'answers._id': ObjectId('573e4d34d5b2cad276caf281')},
        {
            '$set': {
                'answers.$.text': 'Система спеціальним чином орга��ізованих даних — баз даних, програмних, технічних, мовних, організаційно-методичних засобів, призначених тільки для багатоцільового використання даних',
            }
        }
    )


    // Show cool stats in robomongo
    
    var unchecked = db.getCollection('questions').count({'correct': false, 'answers.checked': {$not: {'$all': [true]}}}); 'Unchecked: ' + unchecked + ' / 629' + '    ' + (unchecked * 100 / 629).toFixed(2) + '%';
    var correct = db.getCollection('questions').count({correct: true}); 'Correct: ' + correct + ' / 629' + '    ' + (correct * 100 / 629).toFixed(2) + '%';
*/