import os
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, Image as RLImage, PageBreak
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm

logo_path = r"d:\# DOWNLOAD\web_disperindagesdm_prototype\assets\brand\logo_pinrang_opt.png"
docs_dir = r"d:\# DOWNLOAD\web_disperindagesdm_prototype\assets\docs"
os.makedirs(docs_dir, exist_ok=True)

styles = getSampleStyleSheet()

kop_title = ParagraphStyle('KopTitle', fontName='Helvetica-Bold', fontSize=12.5, leading=15, alignment=1, textColor=colors.HexColor('#0F172A'))
kop_sub = ParagraphStyle('KopSub', fontName='Helvetica', fontSize=8.5, leading=12, alignment=1, textColor=colors.HexColor('#334155'))
doc_title = ParagraphStyle('DocTitle', fontName='Helvetica-Bold', fontSize=12, leading=16, alignment=1, textColor=colors.HexColor('#0F172A'), spaceAfter=4)
doc_sub = ParagraphStyle('DocSub', fontName='Helvetica-Bold', fontSize=10, leading=14, alignment=1, textColor=colors.HexColor('#475569'), spaceAfter=14)
body_text = ParagraphStyle('BodyTxt', fontName='Helvetica', fontSize=9.5, leading=13.5, alignment=4, textColor=colors.HexColor('#1E293B'), spaceAfter=6)
table_hdr = ParagraphStyle('TableHdr', fontName='Helvetica-Bold', fontSize=8.5, leading=11, alignment=1, textColor=colors.white)
table_cell = ParagraphStyle('TableCell', fontName='Helvetica', fontSize=8, leading=10.5, textColor=colors.HexColor('#1E293B'))
table_cell_c = ParagraphStyle('TableCellC', fontName='Helvetica', fontSize=8, leading=10.5, alignment=1, textColor=colors.HexColor('#1E293B'))
table_cell_b = ParagraphStyle('TableCellB', fontName='Helvetica-Bold', fontSize=8, leading=10.5, textColor=colors.HexColor('#0F172A'))

def get_kop():
    logo_w, logo_h = 1.8*cm, 2.1*cm
    kop_text = [
        Paragraph("<b>PEMERINTAH KABUPATEN PINRANG</b>", kop_title),
        Paragraph("<b>DINAS PERINDUSTRIAN, PERDAGANGAN, ENERGI DAN SUMBER DAYA MINERAL</b>", kop_title),
        Paragraph("Jalan Bintang No. 1, Kabupaten Pinrang, Sulawesi Selatan 91212<br/>Laman: <u>disperindag.pinrangkab.go.id</u> &bull; Pos-el: <u>dinasperindagem.pinrang@gmail.com</u>", kop_sub)
    ]
    kop_table = Table([[RLImage(logo_path, width=logo_w, height=logo_h), kop_text]], colWidths=[2.2*cm, 14.8*cm])
    kop_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('ALIGN', (0,0), (0,0), 'CENTER'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 0),
    ]))
    return [
        kop_table,
        Spacer(1, 4),
        HRFlowable(width="100%", thickness=2.2, color=colors.HexColor('#0F172A'), spaceAfter=1),
        HRFlowable(width="100%", thickness=0.8, color=colors.HexColor('#0F172A'), spaceAfter=12)
    ]

# 1. RENJA 2026
def build_renja_pdf():
    p = os.path.join(docs_dir, "renja_tahunan_disperindagesdm_pinrang_2026.pdf")
    doc = SimpleDocTemplate(p, pagesize=A4, rightMargin=2.0*cm, leftMargin=2.0*cm, topMargin=1.8*cm, bottomMargin=1.8*cm)
    el = []
    el.extend(get_kop())
    el.append(Paragraph("RINGKASAN EKSEKUTIF RENCANA KERJA (RENJA) TAHUN 2026", doc_title))
    el.append(Paragraph("DINAS PERINDUSTRIAN, PERDAGANGAN, ENERGI DAN SUMBER DAYA MINERAL KABUPATEN PINRANG", doc_sub))
    el.append(Paragraph("Rencana Kerja (Renja) Tahun Anggaran 2026 merupakan penjabaran operasional tahun kedua dari Rencana Strategis (Renstra) Disperindag ESDM Kabupaten Pinrang 2025–2026 yang mengacu pada arah kebijakan Rencana Kerja Pemerintah Daerah (RKPD) Kabupaten Pinrang Tahun 2026.", body_text))
    
    prog_data = [
        [Paragraph("NO", table_hdr), Paragraph("PROGRAM PRIORITAS DAERAH", table_hdr), Paragraph("INDIKATOR KINERJA UTAMA (IKU)", table_hdr), Paragraph("TARGET 2026", table_hdr), Paragraph("PAGU ALOKASI (RP)", table_hdr)],
        [Paragraph("1", table_cell_c), Paragraph("Program Pelayanan Penunjang Urusan Pemerintahan Daerah", table_cell), Paragraph("Nilai Akuntabilitas Kinerja Instansi (SAKIP)", table_cell), Paragraph("Predikat A (85,00)", table_cell_c), Paragraph("Rp 3.450.000.000,-", table_cell_c)],
        [Paragraph("2", table_cell_c), Paragraph("Program Perencanaan dan Pembangunan Industri Daerah", table_cell), Paragraph("Pertumbuhan Wirausaha Baru IKM Binaan & TKDN", table_cell), Paragraph("120 IKM Ber-HAKI/Halal", table_cell_c), Paragraph("Rp 1.280.000.000,-", table_cell_c)],
        [Paragraph("3", table_cell_c), Paragraph("Program Pengembangan Ekspor & Pengendalian Inflasi Perdagangan", table_cell), Paragraph("Tingkat Stabilitas Harga 12 Bahan Pokok (Inflasi)", table_cell), Paragraph("&le; 2,5 &plusmn; 1%", table_cell_c), Paragraph("Rp 1.650.000.000,-", table_cell_c)],
        [Paragraph("4", table_cell_c), Paragraph("Program Kemetrologian Legal (Tertib Ukur)", table_cell), Paragraph("Persentase UTTP Ber-Cap Tanda Tera Sah", table_cell), Paragraph("96,50%", table_cell_c), Paragraph("Rp 890.000.000,-", table_cell_c)],
        [Paragraph("5", table_cell_c), Paragraph("Program Pengawasan Distribusi Energi & Kelistrikan", table_cell), Paragraph("Kepatuhan HET Pangkalan LPG 3 Kg & Elektrifikasi", table_cell), Paragraph("98,00%", table_cell_c), Paragraph("Rp 750.000.000,-", table_cell_c)],
        [Paragraph("<b>TOTAL</b>", table_cell_b), Paragraph("<b>ALOKASI BELANJA KEDINASAN TAHUN ANGGARAN 2026</b>", table_cell_b), Paragraph("<b>5 PROGRAM STRATEGIS</b>", table_cell_b), Paragraph("<b>100% TERCAPAI</b>", table_cell_b), Paragraph("<b>Rp 8.020.000.000,-</b>", table_cell_b)]
    ]
    t = Table(prog_data, colWidths=[0.8*cm, 5.2*cm, 4.8*cm, 2.7*cm, 3.5*cm])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0F2C59')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#0F2C59')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
        ('BACKGROUND', (0,-1), (-1,-1), colors.HexColor('#FEF3C7')),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    el.append(t)
    el.append(Spacer(1, 14))
    
    sig = [["", Paragraph("Pinrang, 05 Januari 2026<br/><br/><b>KEPALA DINAS PERINDUSTRIAN, PERDAGANGAN, ENERGI DAN SUMBER DAYA MINERAL KABUPATEN PINRANG,</b><br/><br/><br/><br/><b><u>MUH. YUSUF NUR, S.STP., M.Si.</u></b><br/>Pembina Utama Muda (IV/c)<br/>NIP. 19780512 199711 1 001", body_text)]]
    ts = Table(sig, colWidths=[8.0*cm, 9.0*cm])
    ts.setStyle(TableStyle([('VALIGN', (0,0), (-1,-1), 'TOP')]))
    el.append(ts)
    doc.build(el)
    print(f"Generated: {p}")

# 2. LKJIP 2025
def build_lkjip_pdf():
    p = os.path.join(docs_dir, "lkjip_akuntabilitas_kinerja_disperindagesdm_2025.pdf")
    doc = SimpleDocTemplate(p, pagesize=A4, rightMargin=2.0*cm, leftMargin=2.0*cm, topMargin=1.8*cm, bottomMargin=1.8*cm)
    el = []
    el.extend(get_kop())
    el.append(Paragraph("RINGKASAN EKSEKUTIF LAPORAN KINERJA INSTANSI PEMERINTAH (LKjIP) TAHUN 2025", doc_title))
    el.append(Paragraph("DINAS PERINDUSTRIAN, PERDAGANGAN, ENERGI DAN SUMBER DAYA MINERAL KABUPATEN PINRANG", doc_sub))
    el.append(Paragraph("Laporan Kinerja Instansi Pemerintah (LKjIP) Tahun 2025 menyajikan pertanggungjawaban capaian kinerja sasaran strategis, program kerja, dan realisasi anggaran Dinas Perindustrian, Perdagangan, Energi dan Sumber Daya Mineral Kabupaten Pinrang selama Tahun Anggaran 2025.", body_text))
    
    lkjip_data = [
        [Paragraph("NO", table_hdr), Paragraph("SASARAN STRATEGIS DAERAH", table_hdr), Paragraph("INDIKATOR KINERJA UTAMA (IKU)", table_hdr), Paragraph("TARGET", table_hdr), Paragraph("REALISASI", table_hdr), Paragraph("CAPAIAN", table_hdr)],
        [Paragraph("1", table_cell_c), Paragraph("Meningkatnya Pertumbuhan dan Daya Saing IKM", table_cell), Paragraph("Jumlah IKM Difasilitasi Sertifikasi Halal/TKDN", table_cell), Paragraph("85 IKM", table_cell_c), Paragraph("94 IKM", table_cell_c), Paragraph("110,59%", table_cell_c)],
        [Paragraph("2", table_cell_c), Paragraph("Terjaganya Stabilitas Harga dan Pasokan Bahan Pokok", table_cell), Paragraph("Laju Inflasi Pangan Daerah", table_cell), Paragraph("&le; 2,8%", table_cell_c), Paragraph("2,14%", table_cell_c), Paragraph("123,55%", table_cell_c)],
        [Paragraph("3", table_cell_c), Paragraph("Meningkatnya Perlindungan Konsumen & Tertib Ukur", table_cell), Paragraph("Persentase Alat UTTP Sah Bertanda Tera", table_cell), Paragraph("92,00%", table_cell_c), Paragraph("95,30%", table_cell_c), Paragraph("103,59%", table_cell_c)],
        [Paragraph("4", table_cell_c), Paragraph("Optimalnya Pengawasan Energi Bersubsidi", table_cell), Paragraph("Tingkat Kepatuhan HET Pangkalan LPG 3 Kg", table_cell), Paragraph("95,00%", table_cell_c), Paragraph("97,80%", table_cell_c), Paragraph("102,95%", table_cell_c)],
        [Paragraph("5", table_cell_c), Paragraph("Meningkatnya Kualitas Pelayanan Publik & Akuntabilitas", table_cell), Paragraph("Indeks Kepuasan Masyarakat (IKM) & SAKIP", table_cell), Paragraph("85,00 (A)", table_cell_c), Paragraph("88,64 (A)", table_cell_c), Paragraph("104,28%", table_cell_c)],
        [Paragraph("<b>RATA-RATA</b>", table_cell_b), Paragraph("<b>CAPAIAN KINERJA KEDINASAN TAHUN 2025 (KATEGORI SANGAT BAIK)</b>", table_cell_b), Paragraph("<b>5 SASARAN UTAMA</b>", table_cell_b), Paragraph("-", table_cell_c), Paragraph("-", table_cell_c), Paragraph("<b>108,99%</b>", table_cell_b)]
    ]
    t = Table(lkjip_data, colWidths=[0.8*cm, 4.4*cm, 4.4*cm, 2.3*cm, 2.3*cm, 2.8*cm])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0F2C59')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#0F2C59')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
        ('BACKGROUND', (0,-1), (-1,-1), colors.HexColor('#FEF3C7')),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    el.append(t)
    el.append(Spacer(1, 14))
    
    sig = [["", Paragraph("Pinrang, 30 Desember 2025<br/><br/><b>KEPALA DINAS PERINDUSTRIAN, PERDAGANGAN, ENERGI DAN SUMBER DAYA MINERAL KABUPATEN PINRANG,</b><br/><br/><br/><br/><b><u>MUH. YUSUF NUR, S.STP., M.Si.</u></b><br/>Pembina Utama Muda (IV/c)<br/>NIP. 19780512 199711 1 001", body_text)]]
    ts = Table(sig, colWidths=[8.0*cm, 9.0*cm])
    ts.setStyle(TableStyle([('VALIGN', (0,0), (-1,-1), 'TOP')]))
    el.append(ts)
    doc.build(el)
    print(f"Generated: {p}")

# 3. SOP TERA UTTP 2026
def build_sop_tera_pdf():
    p = os.path.join(docs_dir, "sop_standar_pelayanan_tera_uttp_metrologi_2026.pdf")
    doc = SimpleDocTemplate(p, pagesize=A4, rightMargin=2.0*cm, leftMargin=2.0*cm, topMargin=1.8*cm, bottomMargin=1.8*cm)
    el = []
    el.extend(get_kop())
    el.append(Paragraph("STANDAR OPERASIONAL PROSEDUR (SOP) PELAYANAN TERA DAN TERA ULANG UTTP", doc_title))
    el.append(Paragraph("NOMOR: SOP/DPE/UML/01/2026 &bull; BIDANG KEMETROLOGIAN LEGAL", doc_sub))
    el.append(Paragraph("Standar Pelayanan ini mengatur tata cara, persyaratan, waktu penyelesaian, dan penjaminan mutu pelaksanaan pengujian alat Ukur, Takar, Timbang, dan Perlengkapannya (UTTP) bagi pedagang pasar, SPBU, SPPBE, dan pelaku industri di wilayah Kabupaten Pinrang.", body_text))
    
    sop_data = [
        [Paragraph("NO", table_hdr), Paragraph("KOMPONEN STANDAR PELAYANAN", table_hdr), Paragraph("URAIAN / KETENTUAN RESMI (SOP KEMETROLOGIAN)", table_hdr)],
        [Paragraph("1", table_cell_c), Paragraph("Persyaratan Pelayanan", table_cell_b), Paragraph("1. Surat Permohonan Tera/Tera Ulang (formulir loket/website).<br/>2. Salinan KTP Pemohon / Izin Usaha (NIB).<br/>3. Membawa alat UTTP atau mengajukan permohonan tera di tempat (lokus).", table_cell)],
        [Paragraph("2", table_cell_c), Paragraph("Sistem, Mekanisme & Prosedur", table_cell_b), Paragraph("1. Registrasi permohonan di loket pelayanan / online.<br/>2. Verifikasi berkas & penerbitan Surat Tugas Pengujian.<br/>3. Pemeriksaan visual & pengujian teknis toleransi BKD oleh Penera Ahli.<br/>4. Pembubuhan Cap Tanda Tera Sah & penerbitan SKHP.", table_cell)],
        [Paragraph("3", table_cell_c), Paragraph("Jangka Waktu Penyelesaian", table_cell_b), Paragraph("<b>1 (satu) hari kerja</b> untuk timbangan meja/elektronik di kantor dinas;<br/><b>Maksimal 3 (tiga) hari kerja</b> untuk tera di tempat (SPBU/Pabrik).", table_cell)],
        [Paragraph("4", table_cell_c), Paragraph("Biaya / Retribusi", table_cell_b), Paragraph("Sesuai Perda Kabupaten Pinrang No. 1 Tahun 2024 (Tanpa Pungutan Liar).", table_cell)],
        [Paragraph("5", table_cell_c), Paragraph("Produk Pelayanan", table_cell_b), Paragraph("1. Cap Tanda Tera Sah Tahun 2026.<br/>2. Surat Keterangan Hasil Pengujian (SKHP) resmi ber-barcode.", table_cell)],
        [Paragraph("6", table_cell_c), Paragraph("Kompensasi Keterlambatan", table_cell_b), Paragraph("Bebas biaya antar SKHP ke alamat pemohon & prioritas layanan cepat.", table_cell)]
    ]
    t = Table(sop_data, colWidths=[0.8*cm, 4.8*cm, 11.4*cm])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0F2C59')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#0F2C59')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    el.append(t)
    el.append(Spacer(1, 14))
    
    sig = [["", Paragraph("Pinrang, 15 Januari 2026<br/><br/><b>KEPALA DINAS PERINDUSTRIAN, PERDAGANGAN, ENERGI DAN SUMBER DAYA MINERAL KABUPATEN PINRANG,</b><br/><br/><br/><br/><b><u>MUH. YUSUF NUR, S.STP., M.Si.</u></b><br/>Pembina Utama Muda (IV/c)<br/>NIP. 19780512 199711 1 001", body_text)]]
    ts = Table(sig, colWidths=[8.0*cm, 9.0*cm])
    ts.setStyle(TableStyle([('VALIGN', (0,0), (-1,-1), 'TOP')]))
    el.append(ts)
    doc.build(el)
    print(f"Generated: {p}")

build_renja_pdf()
build_lkjip_pdf()
build_sop_tera_pdf()