from flask import Flask, jsonify, render_template, request, json
import sqlite3

db = sqlite3.connect('answers', check_same_thread=False)
c = db.cursor()

app = Flask(__name__)


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/add', methods=['GET'])
def add():
    return render_template('add.html')


@app.route('/add', methods=['POST'])
def add_api():
    data = json.loads(request.data)
    if 'question' in data and 'answer' in data:
        question = data['question'].lower()
        answer = data['question'].lower()
        c.execute('SELECT * FROM QA WHERE (question=? AND answer=?)', (question, answer))
        entry = c.fetchone()
        if entry is None:
            c.execute('INSERT INTO "QA" ("question", "answer") VALUES (?, ?)', (question, answer))
            db.commit()
            return jsonify({'result': 'ok', 'row': c.lastrowid})
        else:
            return jsonify(error=409, text='Conflict'), 409
    else:
        return jsonify(error=422, text='Invalid Data'), 422


@app.route('/find', methods=['GET'])
def find():
    results = []
    text = request.args.get('q', '')
    result = c.execute(
        'SELECT DISTINCT (question), answer FROM QA WHERE lower(question) LIKE lower("%' + text.lower() + '%") LIMIT 15')
    result = result.fetchall()
    if len(result):
        for row in result:
            results.append({'question': row[0].rstrip(), 'answer': row[1].rstrip()})
    return jsonify(results)


@app.route('/js')
def js():
    qa = c.execute('SELECT DISTINCT (question), answer, id FROM QA')
    qa = qa.fetchall()
    qa = json.dumps(qa, separators=(',', ':'), ensure_ascii=False)
    with open('s.js', 'r') as myfile:
        script = myfile.read().replace('[[[1]]]', qa)
        return script, 200, {'Content-Type': 'text/javascript; charset=utf-8'}


if __name__ == '__main__':
    app.run(host="0.0.0.0", port=8418)
