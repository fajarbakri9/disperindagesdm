import json, os, urllib.request, urllib.error

PROJECT_ID = 'disperindagesdm-pinrang'
API_KEY    = os.environ.get('FIREBASE_API_KEY')
if not API_KEY:
  raise RuntimeError('FIREBASE_API_KEY wajib diisi melalui environment, bukan source code')
BASE_URL   = f'https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/(default)/documents'

DEMO_NEWS = [
  {'id':'mn_lpg_001','title':'Kontrak Pangkalan LPG di Pinrang Diputus Gegara Ogah Jual ke Warga','snippet':'Disperindag ESDM Pinrang memutus kontrak pangkalan LPG 3 kg bersubsidi di Duampanua usai terbukti menolak melayani warga sekitar.','summary':'Disperindag ESDM Pinrang memutus kontrak pangkalan LPG 3 kg bersubsidi di Duampanua.','thumbnailUrl':'assets/news/sidak_lpg3kg_pinrang_hd.jpg','sourceUrl':'https://www.detik.com/sulsel/berita/d-8634122/kontrak-pangkalan-lpg-di-pinrang-diputus-gegara-ogah-jual-tabung-ke-tetangga','sourceName':'detikSulsel','sourceDomain':'detik.com','sourceType':'news','sourceIcon':'news','platform':'mainstream','publishedAt':'26 Agustus 2026, 18:49 WITA','topics':['LPG','Distribusi'],'locations':['Duampanua','Pinrang'],'sentiment':'NEGATIF','sentimentScore':-72,'relevanceScore':96,'criticalScore':87,'isCritical':True,'status':'critical','issueId':'lpg_duampanua_20260825'},
  {'id':'mn_pasar_001','title':'Disperindag ESDM Pinrang Gelar Pasar Murah Tekan Inflasi','snippet':'Disperindag ESDM Pinrang gelar pasar murah sembako di 8 kecamatan. Beras SPHP habis 2 jam.','summary':'Disperindag ESDM Pinrang gelar pasar murah di 8 kecamatan.','thumbnailUrl':'assets/news/operasi_pasar_murah_sembako_pinrang.jpg','sourceUrl':'https://fajar.co.id/2024/03/06/tekan-inflasi-pemkab-pinrang-gelar-pasar-murah/','sourceName':'Harian Fajar','sourceDomain':'fajar.co.id','sourceType':'news','sourceIcon':'news','platform':'mainstream','publishedAt':'27 Agustus 2026, 09:30 WITA','topics':['Inflasi','Sembako','Pasar Murah'],'locations':['Watang Sawitto','Pinrang'],'sentiment':'POSITIF','sentimentScore':94,'relevanceScore':90,'criticalScore':10,'isCritical':False,'status':'normal','issueId':''},
  {'id':'mn_tera_001','title':'UML Metrologi Pinrang Tuntaskan Uji Tera 100 Persen Nozzle SPBU Jalur Trans Sulawesi','snippet':'Tim Penera Ahli Metrologi Pinrang selesaikan tera semua SPBU di wilayah Pinrang.','summary':'Metrologi Pinrang selesaikan tera 100% pompa SPBU Trans Sulawesi.','thumbnailUrl':'assets/news/tera_uttp_spbu_hd.jpg','sourceUrl':'https://makassar.antaranews.com/berita/390211/metrologi-pinrang-uji-tera-spbu-jalur-mudik','sourceName':'ANTARA Makassar','sourceDomain':'antaranews.com','sourceType':'news','sourceIcon':'news','platform':'mainstream','publishedAt':'24 Agustus 2026, 11:00 WITA','topics':['Metrologi','SPBU'],'locations':['Pinrang'],'sentiment':'POSITIF','sentimentScore':96,'relevanceScore':88,'criticalScore':5,'isCritical':False,'status':'normal','issueId':''},
  {'id':'mn_solar_001','title':'Cegah Penyimpangan BBM, Kapolres Pinrang Perintahkan Tipidter Perketat Pengawasan SPBU','snippet':'Kapolres Pinrang minta Tipidter perketat pengawasan distribusi solar bersubsidi.','summary':'Kapolres Pinrang intensifkan pengawasan distribusi solar subsidi.','thumbnailUrl':'assets/news/sidak_lpg3kg_pinrang_hd.jpg','sourceUrl':'https://makassar.tribunnews.com/tag/pinrang','sourceName':'Tribun Timur','sourceDomain':'tribunnews.com','sourceType':'news','sourceIcon':'news','platform':'mainstream','publishedAt':'23 Agustus 2026, 19:58 WITA','topics':['BBM','Solar'],'locations':['Pinrang'],'sentiment':'NEGATIF','sentimentScore':-58,'relevanceScore':82,'criticalScore':68,'isCritical':True,'status':'waspada','issueId':'solar_20260822'},
  {'id':'mn_cabai_001','title':'Harga Cabai Rawit Merah di Pinrang Tembus Rp 55.000 per Kg, TPID Siapkan Pasokan','snippet':'TPID Pinrang catat lonjakan harga cabai ke Rp 55.000/kg. Disperindag siapkan intervensi.','summary':'Harga cabai rawit naik Rp 55.000/kg, TPID Pinrang siapkan intervensi.','thumbnailUrl':'assets/banner/pasar_sentral_pinrang_clean_hd.jpg','sourceUrl':'https://pinrangkab.go.id/berita','sourceName':'Pinrang Terkini','sourceDomain':'pinrangkab.go.id','sourceType':'news','sourceIcon':'news','platform':'mainstream','publishedAt':'22 Agustus 2026, 11:30 WITA','topics':['Harga Pangan','Inflasi'],'locations':['Pinrang'],'sentiment':'NEGATIF','sentimentScore':-45,'relevanceScore':78,'criticalScore':55,'isCritical':False,'status':'monitor','issueId':'harga_pangan_20260822'},
  {'id':'mn_kopi_001','title':'Kopi Robusta Lembang Pinrang Raih Pasar Kafe Premium, Omset IKM Naik 3 Kali Lipat','snippet':'Program IKM Disperindag ESDM Pinrang berhasil. Kopi Lembang masuk kafe premium Makassar.','summary':'IKM kopi Lembang Pinrang berhasil masuk pasar premium.','thumbnailUrl':'assets/news/kopi_olahan_pinrang_hd.jpg','sourceUrl':'https://fajar.co.id','sourceName':'Harian Fajar','sourceDomain':'fajar.co.id','sourceType':'news','sourceIcon':'news','platform':'mainstream','publishedAt':'21 Agustus 2026, 14:00 WITA','topics':['IKM','Kopi','UMKM'],'locations':['Lembang','Pinrang'],'sentiment':'POSITIF','sentimentScore':98,'relevanceScore':85,'criticalScore':0,'isCritical':False,'status':'normal','issueId':''},
]

TRENDING = [
  {'id':'tt_lpg','topic':'Pengawasan HET Gas LPG 3 Kg & Penertiban Pengecer','category':'ESDM & Energi','volume':512,'count':512,'is_critical':True,'isCritical':True},
  {'id':'tt_pasar','topic':'Operasi Pasar Murah Sembako TPID Tekan Inflasi','category':'Perdagangan','volume':428,'count':428,'is_critical':False,'isCritical':False},
  {'id':'tt_tera','topic':'Uji Tera Nozzle SPBU Jalur Trans Sulawesi','category':'Kemetrologian','volume':264,'count':264,'is_critical':False,'isCritical':False},
  {'id':'tt_solar','topic':'Dugaan Penyimpangan Solar Bersubsidi di SPBU Pinrang','category':'Pengawasan BBM','volume':186,'count':186,'is_critical':True,'isCritical':True},
  {'id':'tt_ikm','topic':'Fasilitasi Sertifikasi Halal & Kemasan IKM Binaan Disperindag','category':'Perindustrian','volume':92,'count':92,'is_critical':False,'isCritical':False},
]

CRIT_ISSUES = [
  {
    'id': 'lpg_duampanua_20260825',
    'title': 'Dugaan Pelanggaran Distribusi & Penolakan Penjualan LPG 3 Kg di Duampanua',
    'category': 'lpg',
    'status': 'tinggi',
    'criticalScore': 87,
    'sourceCount': 3,
    'mentionCount': 6,
    'sentiment': 'negative',
    'escalationStatus': 'regional',
    'location': {'district': 'Duampanua', 'village': 'Bungi'},
    'latestUpdate': '2026-08-26T18:49:00+08:00',
    'escalationTimeline': [
      {'time': '08:15', 'source': 'Pinrang Terkini'},
      {'time': '12:30', 'source': 'BeritaSulsel'},
      {'time': '18:49', 'source': 'detikSulsel'}
    ],
    'watchlistMatch': ['lpg']
  },
  {
    'id': 'solar_subsidi_20260822',
    'title': 'Pengawasan Distribusi Solar Bersubsidi di SPBU Jalur Trans Sulawesi & Suppa',
    'category': 'bbm',
    'status': 'waspada',
    'criticalScore': 68,
    'sourceCount': 2,
    'mentionCount': 5,
    'sentiment': 'negative',
    'escalationStatus': 'local',
    'location': {'district': 'Suppa', 'village': ''},
    'latestUpdate': '2026-08-23T19:58:00+08:00',
    'escalationTimeline': [
      {'time': '10:00', 'source': 'BeritaSulsel'},
      {'time': '19:58', 'source': 'Tribun Timur'}
    ],
    'watchlistMatch': ['solar']
  }
]

SNAPSHOT = {
  'updatedAt': '2026-08-28T11:45:00+08:00',
  'updatedIso': '2026-08-28T03:45:00Z',
  'latestNews': DEMO_NEWS,
  'latestMentions': DEMO_NEWS,
  'trendingTopics': TRENDING,
  'criticalIssues': CRIT_ISSUES,
  'stats': {'totalMentions': 1482, 'criticalIssues': 2, 'negativePct': 15, 'totalAspirations': 24, 'activeSources': 30}
}

def to_fs(val):
    if isinstance(val, bool): return {'booleanValue': val}
    elif isinstance(val, int): return {'integerValue': str(val)}
    elif isinstance(val, float): return {'doubleValue': val}
    elif isinstance(val, str): return {'stringValue': val}
    elif isinstance(val, list): return {'arrayValue': {'values': [to_fs(i) for i in val]}}
    elif isinstance(val, dict): return {'mapValue': {'fields': {k: to_fs(v) for k, v in val.items()}}}
    return {'nullValue': None}

def patch(col, doc_id, data):
    url = f'{BASE_URL}/{col}/{doc_id}?key={API_KEY}'
    fields = {k: to_fs(v) for k, v in data.items()}
    body = json.dumps({'fields': fields}).encode()
    req = urllib.request.Request(url, data=body, method='PATCH', headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req) as r:
            print(f'  [OK] {col}/{doc_id}')
            return True
    except urllib.error.HTTPError as e:
        print(f'  [ERR] {col}/{doc_id}: HTTP {e.code}')
        return False

print('=== SEED SNAPSHOT TO FIRESTORE ===')
patch('dashboard_snapshot', 'current', {'data': json.dumps(SNAPSHOT), 'updatedAt': SNAPSHOT['updatedAt'], 'updatedIso': SNAPSHOT['updatedIso']})
for art in DEMO_NEWS:
    patch('media_intelligence_feeds', art['id'], art)
print('=== SELESAI ===')