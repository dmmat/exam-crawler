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
    return new Promise((res, rej) => {
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
    };
});


const main = co.wrap(function *() {
    ph = yield phantom.create();

    const page = yield ph.createPage();
    yield page.open(config.host);
    yield page.evaluate(function() {
        document.getElementById('login_username').value = 'vgamula';
        document.getElementById('login_password').value = 'q1w2e3';
        document.getElementById('login').submit();
    });
    yield sleep(1000);
    yield page.open('https://msn.khnu.km.ua/mod/quiz/view.php?id=198028');
    yield sleep(1000);
    yield page.evaluate(function() {
        document.forms[0].submit();
    });
    yield sleep(1000);

    const [qidVal, answId] = yield page.evaluate(function() {
        var questions = document.getElementsByClassName('que');
        var firstQuestionElem = questions[0];
        var qidVal = firstQuestionElem.getElementsByClassName('questionflagpostdata')[0].value;
        qidVal = qidVal.slice(qidVal.indexOf('qid=') + 4);
        qidVal = qidVal.slice(0, qidVal.indexOf('&'));
        return [qidVal, 0];
    });
    const content = yield page.property('content');
    console.log(content);
})

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
