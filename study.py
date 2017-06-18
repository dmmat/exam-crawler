import sys
import time
import sqlite3
import telepot
from telepot.loop import MessageLoop

db = sqlite3.connect('answers', check_same_thread=False)
c = db.cursor()


def on_chat_message(msg):
    text = msg.get('text')
    content_type, chat_type, chat_id = telepot.glance(msg)
    if text == '/start':
        query = "INSERT OR REPLACE INTO user_progress (id, chat_id, progress) VALUES ((SELECT id FROM user_progress WHERE chat_id LIKE %i),%i,2350)" % (chat_id, chat_id)
        c.execute(query)
        db.commit()
        return bot.sendMessage(chat_id, 'начнемо, \n /next - наступне питання \n /start все заново')
    if text == '/next':
        progress = \
        c.execute('SELECT user_progress.progress FROM user_progress WHERE chat_id LIKE %i' % chat_id).fetchone()[0]

        result = c.execute(
            'SELECT question, answer FROM QA WHERE id = %i' % progress)
        result = result.fetchall()

        if len(result):
            for row in result:
                bot.sendMessage(chat_id, '❓: ' + row[0].rstrip() + '\n~~~~~~\n ✅: ' + row[1].rstrip())
        else:
            bot.sendMessage(chat_id, 'дійшов до кінця \n /start щоб почати ')
        c.execute(
            "UPDATE user_progress SET progress=%i WHERE chat_id LIKE %i" % (progress+1, chat_id))
        db.commit()


bot = telepot.Bot(sys.argv[1])
MessageLoop(bot, {'chat': on_chat_message}).run_as_thread()
while 1:
    time.sleep(1000)
