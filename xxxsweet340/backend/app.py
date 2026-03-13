import os
import datetime
import smtplib
from email.message import EmailMessage

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
from pymongo import MongoClient
from bson.objectid import ObjectId
import jwt
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

MONGO_URI = os.getenv('MONGO_URI')
JWT_SECRET = os.getenv('JWT_SECRET', 'change_this_secret')
ADMIN_PASSWORD = os.getenv('ADMIN_PASSWORD', 'admin')

app = Flask(__name__, static_folder=os.path.join(BASE_DIR, '..'), static_url_path='')
CORS(app)

if MONGO_URI:
    client = MongoClient(MONGO_URI)
    try:
        db = client.get_default_database()
    except Exception:
        db = client['appdb']
else:
    client = None
    db = None

uploads_col = db.uploads if db else None
contacts_col = db.contacts if db else None


def make_token():
    payload = {'admin': True, 'iat': datetime.datetime.utcnow()}
    token = jwt.encode(payload, JWT_SECRET, algorithm='HS256')
    return token


def verify_token(token):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
        return payload.get('admin') is True
    except Exception:
        return False


@app.route('/')
def index():
    return app.send_static_file('index.html')


@app.route('/api/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'no file part'}), 400
    f = request.files['file']
    if f.filename == '':
        return jsonify({'error': 'no selected file'}), 400
    filename = secure_filename(f.filename)
    saved_path = os.path.join(UPLOAD_FOLDER, filename)
    f.save(saved_path)
    doc = {
        'filename': filename,
        'original_name': f.filename,
        'path': saved_path,
        'uploaded_at': datetime.datetime.utcnow(),
    }
    if uploads_col:
        res = uploads_col.insert_one(doc)
        doc_id = str(res.inserted_id)
    else:
        doc_id = None
    return jsonify({'id': doc_id, 'filename': filename}), 201


@app.route('/api/uploads', methods=['GET'])
def list_uploads():
    items = []
    if uploads_col:
        for d in uploads_col.find().sort('uploaded_at', -1):
            items.append({'id': str(d['_id']), 'filename': d['filename'], 'original_name': d.get('original_name'), 'uploaded_at': d.get('uploaded_at')})
    else:
        for fn in os.listdir(UPLOAD_FOLDER):
            items.append({'id': None, 'filename': fn})
    return jsonify(items)


@app.route('/uploads/<path:filename>')
def serve_upload(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)


@app.route('/api/contact', methods=['POST'])
def contact():
    data = request.get_json() or request.form
    name = data.get('name')
    email = data.get('email')
    message = data.get('message')
    if not email or not message:
        return jsonify({'error': 'email and message required'}), 400
    doc = {'name': name, 'email': email, 'message': message, 'created_at': datetime.datetime.utcnow()}
    if contacts_col:
        contacts_col.insert_one(doc)

    # optional SMTP
    smtp_server = os.getenv('SMTP_SERVER')
    smtp_port = int(os.getenv('SMTP_PORT', '587'))
    smtp_user = os.getenv('SMTP_USER')
    smtp_pass = os.getenv('SMTP_PASS')
    notify_to = os.getenv('NOTIFY_EMAIL')
    if smtp_server and notify_to:
        try:
            msg = EmailMessage()
            msg['Subject'] = f'Contact from {name or "site"}'
            msg['From'] = smtp_user or notify_to
            msg['To'] = notify_to
            msg.set_content(f'From: {name}\nEmail: {email}\n\n{message}')
            with smtplib.SMTP(smtp_server, smtp_port) as s:
                s.starttls()
                if smtp_user and smtp_pass:
                    s.login(smtp_user, smtp_pass)
                s.send_message(msg)
        except Exception:
            pass

    return jsonify({'status': 'ok'}), 201


@app.route('/api/admin/login', methods=['POST'])
def admin_login():
    data = request.get_json() or {}
    password = data.get('password')
    if not password or password != ADMIN_PASSWORD:
        return jsonify({'error': 'invalid credentials'}), 401
    token = make_token()
    return jsonify({'token': token})


def require_admin(req):
    auth = req.headers.get('Authorization', '')
    if not auth.startswith('Bearer '):
        return False
    token = auth.split(' ', 1)[1]
    return verify_token(token)


@app.route('/api/admin/uploads/<id>', methods=['DELETE'])
def admin_delete_upload(id):
    if not require_admin(request):
        return jsonify({'error': 'unauthorized'}), 401
    try:
        oid = ObjectId(id)
    except Exception:
        return jsonify({'error': 'invalid id'}), 400
    doc = uploads_col.find_one({'_id': oid}) if uploads_col else None
    if doc:
        path = doc.get('path')
        try:
            if path and os.path.exists(path):
                os.remove(path)
        except Exception:
            pass
        uploads_col.delete_one({'_id': oid})
        return jsonify({'deleted': True})
    return jsonify({'deleted': False}), 404


if __name__ == '__main__':
    port = int(os.getenv('PORT', '5000'))
    app.run(host='0.0.0.0', port=port, debug=True)
