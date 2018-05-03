import sys
import time
import sqlite3
import telepot
from telepot.loop import MessageLoop

db = sqlite3.connect('answers', check_same_thread=False)
c = db.cursor()


def on_chat_message(msg):
    text = msg.get('text')
    add(msg) if text == '/add' else\
    start(msg) if text == '/start' else\
    js(msg) if text == '/js' \
        else default(msg)


def add(msg):
    content_type, chat_type, chat_id = telepot.glance(msg)
    bot.sendMessage(chat_id, 'http://exam.dmat.pp.ua/add')


def js(msg):
    content_type, chat_type, chat_id = telepot.glance(msg)
    bot.sendMessage(chat_id, 'var s = document.createElement("SCRIPT"); s.src = \'https://tr.im/jss\'; document.head.appendChild(s);')


def start(msg):
    content_type, chat_type, chat_id = telepot.glance(msg)
    bot.sendMessage(chat_id, 'Напишіть частину питання, щоб знайти відповідь'
                             '\n /add - додати нове питання і відповідь'
                             '\n /js - код для інджекта в браузер')


def default(msg):
    text = msg.get('text')
    result = c.execute(
        'SELECT DISTINCT (question), answer FROM QA WHERE lower(question) LIKE lower("%' + text.lower() + '%") LIMIT 5')
    content_type, chat_type, chat_id = telepot.glance(msg)
    result = result.fetchall()
    if len(result):
        for row in result:
            bot.sendMessage(chat_id, '❓: ' + row[0].rstrip() + '\n~~~~~~\n ✅: ' + row[1].rstrip())
    else:
        bot.sendMessage(chat_id, '❌ не знайдено 🤔 /add - добавити')


bot = telepot.Bot(sys.argv[1])
MessageLoop(bot, {'chat': on_chat_message}).run_as_thread()
while 1:
    time.sleep(1000)
