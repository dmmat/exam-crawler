const phantom = require('phantom');
const co = require('co');
const mongoose = require('mongoose');
const _ = require('lodash');

const config = require('./config');

const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;


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


const main = co.wrap(function *() {
    ph = yield phantom.create();

    const page = yield ph.createPage();
    yield page.open(config.host);
    yield page.evaluate(function(config) {
        document.getElementById('login_username').value = config.username;
        document.getElementById('login_password').value = config.password;
        document.getElementById('login').submit();
    }, config);
    yield sleep(1000);
    let N = 50;
    while (N--) {
        yield page.open('https://msn.khnu.km.ua/mod/quiz/view.php?id=198028');
        yield sleep(1000);
        yield page.evaluate(function() {
            document.forms[0].submit();
        });
        yield sleep(2000);

        const questions = yield page.evaluate(function() {
            var questions = [].slice.call(document.getElementsByClassName('que'));
            questions = questions.filter(function(question) {
                return !question.querySelector('input[type="checkbox"]');
            });
            console.log(questions);
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
            console.log('Questions are empty. Something went wrong.');
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
        const answerToCheck = _.find(questionToCheck.answers, {checked: false});
        // console.log(localQuestion);
        // console.log(answerToCheck);
        const optionIdToCheck = _.find(localQuestion.answers, {text: answerToCheck.text}).htmlId;

        yield page.evaluate(function(id) {
            document.getElementById(id).checked = true;
            document.querySelector('input[type="submit"]').click();
        }, optionIdToCheck);
        yield sleep(1500);
        yield page.evaluate(function() {
            document.querySelector('input[id^="single"]').click();
        });
        yield sleep(500);
        yield page.evaluate(function() {
            document.querySelector('input[id^="id_yuiconfirmyes"]').click();
        });
        yield sleep(1500);
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
});;

process.on('SIGINT', () => {
    mongoose.disconnect();
    ph.exit();
    console.log('Bye :)');
    process.exit();
});


/*
db.getCollection('questions').update({'answers._id': ObjectId('573e4bc67e0c475a72c371a8')}, {'$set': {'answers.$.text': 'його трансляцію в певну організовану структуру, що підходить для\nподальшої обробки', 'answers.$.correct': true, 'answers.$.checked': true, correct: true}})  
*/