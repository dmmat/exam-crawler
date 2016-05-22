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


const main = co.wrap(function *() {
    const questions = yield Question.find({correct: true});
    const data = _.map(questions, q => {
        return {
            i: q.id,
            a: _.find(q.answers, {correct: true}).text
        }
    });
    console.log(JSON.stringify(data));
});


main().then(() => {
    mongoose.disconnect();
}).catch(() => {
    mongoose.disconnect();
});

process.on('SIGINT', () => {
    mongoose.disconnect();
    process.exit();
});
