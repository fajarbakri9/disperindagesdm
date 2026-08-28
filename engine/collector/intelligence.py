# intelligence.py -- Gemini Intelligence Engine
from __future__ import annotations
import json, os, time
try:
    from google import genai as _genai_module
    _SDK_NEW = True
except ImportError:
    import google.generativeai as _genai_module
    _SDK_NEW = False

GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', '')
_client = None

def _get_client():
    global _client
    if _client is None:
        if _SDK_NEW:
            _client = _genai_module.Client(api_key=GEMINI_API_KEY)
        else:
            _genai_module.configure(api_key=GEMINI_API_KEY)
            _client = _genai_module.GenerativeModel(model_name='gemini-1.5-flash-latest', generation_config={'temperature': 0.1, 'max_output_tokens': 400})
    return _client

def _generate(prompt):
    c = _get_client()
    if _SDK_NEW:
        return c.models.generate_content(model='gemini-2.0-flash', contents=prompt).text.strip()
    return c.generate_content(prompt).text.strip()

TOPICS_LIST = ['LPG','Gas 3 Kg','Distribusi BBM','Solar Subsidi','SPBU','Harga Pangan','Sembako','Cabai','Beras','Minyak Goreng','Inflasi','Pasar Tradisional','Operasi Pasar','Pasar Murah','IKM & UMKM','Sertifikasi Halal','Standarisasi SNI','Metrologi & Tera','UTTP','Pertambangan','Galian C','ESDM','Bulog & Pangan','Bansos','Pengaduan Warga','Aspirasi Masyarakat','Kegiatan Pemerintah','Kebijakan Daerah','Hukum & Keamanan','Lainnya']
ASPIRATION_TYPES = ['complaint','question','request','suggestion','appreciation','report','rumor','none']

def _default_result():
    return {'sentiment':{'label':'neutral','score':0.0,'reason':'API key tidak diset'},'topics':[],'locations':[],'aspiration':{'detected':False,'type':'none'},'criticalIndicators':{'hasComplaint':False,'hasRiskKeyword':False,'estimatedSeverity':30}}

def _parse_result(data):
    s=data.get('sentiment',{}); a=data.get('aspiration',{}); ind=data.get('criticalIndicators',{})
    label=s.get('label','neutral')
    if label not in ('positive','neutral','negative'): label='neutral'
    score=max(-1.0,min(1.0,float(s.get('score',0.0))))
    asp=a.get('type','none')
    if asp not in ASPIRATION_TYPES: asp='none'
    sev=max(0,min(100,int(ind.get('estimatedSeverity',30))))
    return {'sentiment':{'label':label,'score':score,'reason':s.get('reason','')},'topics':[t for t in data.get('topics',[]) if isinstance(t,str)][:5],'locations':[l for l in data.get('locations',[]) if isinstance(l,str)][:5],'aspiration':{'detected':bool(a.get('detected',False)),'type':asp},'criticalIndicators':{'hasComplaint':bool(ind.get('hasComplaint',False)),'hasRiskKeyword':bool(ind.get('hasRiskKeyword',False)),'estimatedSeverity':sev}}

def analyze_article(title, excerpt, retry=2):
    if not GEMINI_API_KEY: return _default_result()
    prompt = f'Anda adalah analis media Disperindag ESDM Pinrang. Analisis: Judul: "{title}" Ringkasan: "{excerpt[:400]}" Balas HANYA JSON: {{"sentiment":{{"label":"positive|neutral|negative","score":0.0,"reason":""}},"topics":[],"locations":[],"aspiration":{{"detected":false,"type":"none"}},"criticalIndicators":{{"hasComplaint":false,"hasRiskKeyword":false,"estimatedSeverity":30}}}}. Topics pilih dari: LPG,Solar,Harga Pangan,Sembako,Metrologi,IKM,Pengaduan,ESDM'
    for i in range(retry+1):
        try:
            raw = _generate(prompt).replace('\\json','').replace('\\','').strip()
            return _parse_result(json.loads(raw))
        except Exception as e:
            print(f'[GEMINI] attempt {i}: {e}')
            if i < retry: time.sleep(2)
    return _default_result()

def analyze_batch(articles, delay=1.5):
    results=[]
    for art in articles:
        intel=analyze_article(art.get('title',''),art.get('excerpt',''))
        art.update(intel); results.append(art); time.sleep(delay)
    return results
