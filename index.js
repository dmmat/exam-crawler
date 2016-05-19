const phantom = require('phantom');
const co = require('co');

const config = require('./config');


let ph = null;

const sleep = (time) => new Promise(res => {
    setTimeout(() => {
        res(true);
    }, time)
});

const waitFor = co.wrap(function *(testFunc, timeOutMillis) {
    return new Promise(function*(res, rej) {
        const start = new Date().getTime();
        const maxtimeOutMillis = timeOutMillis || 3000;
        const condition = false;
        while ((new Date().getTime() - start < maxtimeOutMillis) && !condition ) {
            condition = yield* testFunc();
            if (!condition) {
                yield sleep(100);
            } else {
                break;
            }
        }
        if (condition) {
            res();
        } else {
            rej();
        }
    });f
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
    yield page.open('https://msn.khnu.km.ua/mod/quiz/view.php?id=198028');
    yield sleep(1000);
    yield page.evaluate(function() {
        document.forms[0].submit();
    });
    yield sleep(1000);

    const questions = yield page.evaluate(function() {
        var questions = [].slice.call(document.getElementsByClassName('que'));
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
    console.log(questions[0]);
    const optionIdToCheck = questions[0].answers[0].htmlId;
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
        console.log(document.querySelector('.bestrow.lastrow .c2').innerText);
        return document.querySelector('.bestrow.lastrow .c2').innerText !== "0";
    });
    console.log('Result: ', result);
});

main().then(() => {
    ph.exit();
}).catch(() => {
    ph.exit();
});;

process.on('SIGINT', () => {
    ph.exit();
    console.log('Bye :)');
    process.exit();
});
