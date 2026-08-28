import os
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, Image as RLImage, KeepTogether, PageBreak
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm, mm
from PIL import Image

logo_path = r"d:\# DOWNLOAD\web_disperindagesdm_prototype\assets\brand\logo_pinrang_opt.png"

# ==============================================================================
# 1. GENERATE SK KOMPENSASI PELAYANAN (DOKUMEN RESMI KEDINASAN KELAS SATU)
# ==============================================================================
def build_sk_kompensasi_pdf():
    pdf_path = r"d:\# DOWNLOAD\web_disperindagesdm_prototype\assets\documents\pelayanan\sk-kompensasi-pelayanan.pdf"
    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=A4,
        rightMargin=2.0*cm,
        leftMargin=2.0*cm,
        topMargin=1.8*cm,
        bottomMargin=1.8*cm
    )
    
    styles = getSampleStyleSheet()
    
    # Custom Styles
    kop_title = ParagraphStyle(
        'KopTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12.5,
        leading=15,
        alignment=1, # Center
        textColor=colors.HexColor('#0F172A')
    )
    
    kop_sub = ParagraphStyle(
        'KopSub',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        alignment=1,
        textColor=colors.HexColor('#334155')
    )
    
    sk_header = ParagraphStyle(
        'SKHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=14,
        alignment=1,
        textColor=colors.HexColor('#0F172A'),
        spaceAfter=4
    )
    
    sk_title = ParagraphStyle(
        'SKTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=14,
        alignment=1,
        textColor=colors.HexColor('#0F172A'),
        spaceAfter=12
    )
    
    body_text = ParagraphStyle(
        'BodyTxt',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13.5,
        alignment=4, # Justify
        textColor=colors.HexColor('#1E293B')
    )
    
    body_bold = ParagraphStyle(
        'BodyBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9.5,
        leading=13.5,
        textColor=colors.HexColor('#0F172A')
    )
    
    elements = []
    
    # KOP SURAT BERLOGO RESMI
    logo_w, logo_h = 1.8*cm, 2.1*cm
    kop_text = [
        Paragraph("<b>PEMERINTAH KABUPATEN PINRANG</b>", kop_title),
        Paragraph("<b>DINAS PERINDUSTRIAN, PERDAGANGAN, ENERGI DAN SUMBER DAYA MINERAL</b>", kop_title),
        Paragraph("Jalan Bintang No. 1, Kabupaten Pinrang, Sulawesi Selatan 91212<br/>Laman: <u>disperindag.pinrangkab.go.id</u> &bull; Pos-el: <u>dinasperindagem.pinrang@gmail.com</u> &bull; Hotline: 0823 1600 2226", kop_sub)
    ]
    
    kop_table = Table([[RLImage(logo_path, width=logo_w, height=logo_h), kop_text]], colWidths=[2.2*cm, 14.8*cm])
    kop_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('ALIGN', (0,0), (0,0), 'CENTER'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 0),
    ]))
    elements.append(kop_table)
    elements.append(Spacer(1, 4))
    elements.append(HRFlowable(width="100%", thickness=2.2, color=colors.HexColor('#0F172A'), spaceAfter=1))
    elements.append(HRFlowable(width="100%", thickness=0.8, color=colors.HexColor('#0F172A'), spaceAfter=12))
    
    # JUDUL KEPUTUSAN
    elements.append(Paragraph("KEPUTUSAN KEPALA DINAS PERINDUSTRIAN, PERDAGANGAN, ENERGI DAN SUMBER DAYA MINERAL<br/>KABUPATEN PINRANG", sk_header))
    elements.append(Paragraph("NOMOR: 800.1.1/ 04 /DPE-ESDM/I/2026", sk_header))
    elements.append(Spacer(1, 4))
    elements.append(Paragraph("TENTANG<br/>PENETAPAN STANDAR KOMPENSASI PELAYANAN PUBLIK<br/>PADA DINAS PERINDUSTRIAN, PERDAGANGAN, ENERGI DAN SUMBER DAYA MINERAL KABUPATEN PINRANG", sk_title))
    elements.append(Paragraph("<b>KEPALA DINAS PERINDUSTRIAN, PERDAGANGAN, ENERGI DAN SUMBER DAYA MINERAL KABUPATEN PINRANG,</b>", body_bold))
    elements.append(Spacer(1, 6))
    
    # KONSIDERANS MENIMBANG & MENGINGAT
    data_konsiderans = [
        [
            Paragraph("<b>Menimbang</b>", body_bold),
            Paragraph(":", body_bold),
            Paragraph("a. bahwa dalam rangka mewujudkan penyelenggaraan pelayanan publik yang transparan, akuntabel, dan berkeadilan serta memberikan kepastian hak bagi pengguna layanan sebagaimana diamanatkan Undang-Undang Nomor 25 Tahun 2009 tentang Pelayanan Publik;<br/>"
                      "b. bahwa apabila dalam penyelenggaraan pelayanan publik terjadi keterlambatan atau ketidaksesuaian dengan Standar Operasional Prosedur (SOP) yang telah ditetapkan, maka penyelenggara berkewajiban memberikan kompensasi ganti rugi;<br/>"
                      "c. bahwa berdasarkan pertimbangan sebagaimana dimaksud pada huruf a dan huruf b, perlu menetapkan Keputusan Kepala Dinas tentang Standar Kompensasi Pelayanan Publik.", body_text)
        ],
        [
            Paragraph("<b>Mengingat</b>", body_bold),
            Paragraph(":", body_bold),
            Paragraph("1. Undang-Undang Nomor 25 Tahun 2009 tentang Pelayanan Publik;<br/>"
                      "2. Peraturan Menteri PAN-RB Nomor 15 Tahun 2014 tentang Pedoman Standar Pelayanan;<br/>"
                      "3. Peraturan Menteri PAN-RB Nomor 14 Tahun 2017 tentang Pedoman Penyusunan Survei Kepuasan Masyarakat;<br/>"
                      "4. Peraturan Daerah Kabupaten Pinrang Nomor 8 Tahun 2016 tentang Pembentukan dan Susunan Perangkat Daerah;<br/>"
                      "5. Peraturan Bupati Pinrang Nomor 35 Tahun 2023 tentang Kedudukan, Susunan Organisasi, Tugas dan Fungsi Serta Tata Kerja Disperindag ESDM.", body_text)
        ]
    ]
    t_kons = Table(data_konsiderans, colWidths=[2.6*cm, 0.4*cm, 14.0*cm])
    t_kons.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('TOPPADDING', (0,0), (-1,-1), 0),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
    ]))
    elements.append(t_kons)
    elements.append(Spacer(1, 6))
    
    # MEMUTUSKAN
    elements.append(Paragraph("<b>MEMUTUSKAN:</b>", ParagraphStyle('CenterBold', parent=body_bold, alignment=1)))
    elements.append(Spacer(1, 4))
    
    data_dictum = [
        [
            Paragraph("<b>Menetapkan</b>", body_bold),
            Paragraph(":", body_bold),
            Paragraph("<b>KEPUTUSAN KEPALA DINAS TENTANG PENETAPAN STANDAR KOMPENSASI PELAYANAN PUBLIK DISPERINDAG ESDM KABUPATEN PINRANG.</b>", body_text)
        ],
        [
            Paragraph("<b>KESATU</b>", body_bold),
            Paragraph(":", body_bold),
            Paragraph("Menetapkan Standar Kompensasi Pelayanan Publik pada seluruh jenis loket pelayanan di lingkungan Dinas Perindustrian, Perdagangan, Energi dan Sumber Daya Mineral Kabupaten Pinrang apabila waktu pelayanan melebihi batas waktu Standar Pelayanan (SOP) yang telah ditetapkan karena kelalaian teknis/administrasi petugas.", body_text)
        ],
        [
            Paragraph("<b>KEDUA</b>", body_bold),
            Paragraph(":", body_bold),
            Paragraph("Bentuk kompensasi pelayanan sebagaimana dimaksud dalam Diktum KESATU meliputi:<br/>"
                      "a. <b>Penyampaian Permohonan Maaf Resmi Tertulis</b> dari Pejabat Pemberi Layanan / Kepala Unit Kerja;<br/>"
                      "b. <b>Jalur Prioritas Pemrosesan Langsung (Express Lane)</b> tanpa antrean tambahan pada tahapan berikutnya;<br/>"
                      "c. <b>Layanan Pengantaran Produk Pelayanan Langsung ke Alamat Pemohon (Free Delivery Service)</b> di wilayah Kabupaten Pinrang bagi dokumen sertifikasi IKM, SKHP Tera, dan Rekomendasi ESDM;<br/>"
                      "d. <b>Pemberian Souvenir / Fasilitas Penggantian Dokumen</b> yang didanai melalui pos operasional layanan kedinasan.", body_text)
        ],
        [
            Paragraph("<b>KETIGA</b>", body_bold),
            Paragraph(":", body_bold),
            Paragraph("Kompensasi diberikan secara langsung paling lambat 1 x 24 jam sejak terverifikasinya keterlambatan waktu pelayanan oleh Tim Penanganan Pengaduan dan Pengawasan Internal Dinas.", body_text)
        ],
        [
            Paragraph("<b>KEEMPAT</b>", body_bold),
            Paragraph(":", body_bold),
            Paragraph("Keputusan ini mulai berlaku pada tanggal ditetapkan, dengan ketentuan apabila di kemudian hari terdapat kekeliruan akan diperbaiki sebagaimana mestinya.", body_text)
        ]
    ]
    t_dict = Table(data_dictum, colWidths=[2.6*cm, 0.4*cm, 14.0*cm])
    t_dict.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('TOPPADDING', (0,0), (-1,-1), 0),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
    ]))
    elements.append(t_dict)
    elements.append(Spacer(1, 14))
    
    # TANDA TANGAN KADIS & TEMBUSAN
    sig_data = [
        [
            "",
            Paragraph("Ditetapkan di Pinrang<br/>pada tanggal 02 Januari 2026<br/><br/><b>KEPALA DINAS PERINDUSTRIAN, PERDAGANGAN, ENERGI DAN SUMBER DAYA MINERAL KABUPATEN PINRANG,</b><br/><br/><br/><br/><b><u>MUH. YUSUF NUR, S.STP., M.Si.</u></b><br/>Pembina Utama Muda (IV/c)<br/>NIP. 19780512 199711 1 001", body_text)
        ]
    ]
    t_sig = Table(sig_data, colWidths=[8.0*cm, 9.0*cm])
    t_sig.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('ALIGN', (1,0), (1,0), 'LEFT'),
    ]))
    elements.append(t_sig)
    
    elements.append(Spacer(1, 8))
    elements.append(Paragraph("<u>Tembusan disampaikan kepada Yth:</u><br/>"
                              "1. Pj. Bupati Pinrang (sebagai laporan);<br/>"
                              "2. Inspektur Daerah Kabupaten Pinrang;<br/>"
                              "3. Kepala Bagian Organisasi Setda Kabupaten Pinrang;<br/>"
                              "4. Pertinggal.", ParagraphStyle('Tembusan', parent=styles['Normal'], fontName='Helvetica', fontSize=8, leading=11, textColor=colors.HexColor('#64748B'))))
    
    doc.build(elements)
    print(f"Generated Pro SK: {pdf_path}")

# ==============================================================================
# 2. GENERATE LAPORAN HASIL SKM 2025 (PUBLIKASI EKSEKUTIF IKM RESMI)
# ==============================================================================
def build_laporan_skm_pdf():
    pdf_path = r"d:\# DOWNLOAD\web_disperindagesdm_prototype\assets\documents\skm\hasil-skm-2025.pdf"
    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=A4,
        rightMargin=2.0*cm,
        leftMargin=2.0*cm,
        topMargin=1.8*cm,
        bottomMargin=1.8*cm
    )
    
    styles = getSampleStyleSheet()
    
    kop_title = ParagraphStyle('KopTitle', fontName='Helvetica-Bold', fontSize=12.5, leading=15, alignment=1, textColor=colors.HexColor('#0F172A'))
    kop_sub = ParagraphStyle('KopSub', fontName='Helvetica', fontSize=8.5, leading=12, alignment=1, textColor=colors.HexColor('#334155'))
    
    doc_title = ParagraphStyle('DocTitle', fontName='Helvetica-Bold', fontSize=12, leading=16, alignment=1, textColor=colors.HexColor('#1E3A8A'), spaceAfter=4)
    doc_sub = ParagraphStyle('DocSub', fontName='Helvetica-Bold', fontSize=10, leading=14, alignment=1, textColor=colors.HexColor('#334155'), spaceAfter=14)
    
    body_text = ParagraphStyle('BodyTxt', fontName='Helvetica', fontSize=9.5, leading=13.5, alignment=4, textColor=colors.HexColor('#1E293B'), spaceAfter=8)
    table_hdr = ParagraphStyle('TableHdr', fontName='Helvetica-Bold', fontSize=9, leading=11, alignment=1, textColor=colors.white)
    table_cell = ParagraphStyle('TableCell', fontName='Helvetica', fontSize=8.5, leading=11, textColor=colors.HexColor('#1E293B'))
    table_cell_center = ParagraphStyle('TableCellC', fontName='Helvetica', fontSize=8.5, leading=11, alignment=1, textColor=colors.HexColor('#1E293B'))
    table_cell_bold = ParagraphStyle('TableCellB', fontName='Helvetica-Bold', fontSize=8.5, leading=11, alignment=1, textColor=colors.HexColor('#0F172A'))
    
    elements = []
    
    # KOP SURAT
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
    elements.append(kop_table)
    elements.append(Spacer(1, 4))
    elements.append(HRFlowable(width="100%", thickness=2.2, color=colors.HexColor('#0F172A'), spaceAfter=1))
    elements.append(HRFlowable(width="100%", thickness=0.8, color=colors.HexColor('#0F172A'), spaceAfter=12))
    
    # JUDUL LAPORAN
    elements.append(Paragraph("LAPORAN HASIL PENGUKURAN SURVEI KEPUASAN MASYARAKAT (SKM)", doc_title))
    elements.append(Paragraph("DINAS PERINDUSTRIAN, PERDAGANGAN, ENERGI DAN SUMBER DAYA MINERAL KABUPATEN PINRANG<br/>PERIODE TAHUN ANGGARAN 2025", doc_sub))
    
    # RINGKASAN SCORE HIGHLIGHT CARD
    highlight_data = [
        [
            Paragraph("<b>NILAI INDEKS SKM</b><br/><font size=16 color='#1E3A8A'><b>88.64</b></font><br/>Skala 25 - 100", ParagraphStyle('Score', parent=table_cell_center, leading=16)),
            Paragraph("<b>MUTU PELAYANAN</b><br/><font size=16 color='#16A34A'><b>A (SANGAT BAIK)</b></font><br/>Kategori Kinerja Prima", ParagraphStyle('Score2', parent=table_cell_center, leading=16)),
            Paragraph("<b>TOTAL RESPONDEN</b><br/><font size=16 color='#D97706'><b>450 Orang</b></font><br/>Masyarakat & Pelaku Usaha", ParagraphStyle('Score3', parent=table_cell_center, leading=16))
        ]
    ]
    t_hl = Table(highlight_data, colWidths=[5.6*cm, 5.8*cm, 5.6*cm])
    t_hl.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F8FAFC')),
        ('BOX', (0,0), (-1,-1), 1.5, colors.HexColor('#CBD5E1')),
        ('INNERGRID', (0,0), (-1,-1), 1, colors.HexColor('#E2E8F0')),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
    ]))
    elements.append(t_hl)
    elements.append(Spacer(1, 10))
    
    elements.append(Paragraph("Berdasarkan Peraturan Menteri Pendayagunaan Aparatur Negara dan Reformasi Birokrasi Nomor 14 Tahun 2017 tentang Pedoman Penyusunan Survei Kepuasan Masyarakat Unit Penyelenggara Pelayanan Publik, berikut adalah rekapitulasi nilai rata-rata dari 9 (sembilan) unsur pelayanan publik pada Dinas Perindustrian, Perdagangan, Energi dan Sumber Daya Mineral Kabupaten Pinrang Tahun 2025:", body_text))
    
    # TABEL 9 UNSUR SKM
    table_data = [
        [Paragraph("NO", table_hdr), Paragraph("UNSUR PELAYANAN (PERMENPAN-RB 14/2017)", table_hdr), Paragraph("NILAI RATA2 (NRR)", table_hdr), Paragraph("NILAI TERTEMBANG", table_hdr), Paragraph("KATEGORI MUTU", table_hdr)],
        [Paragraph("U1", table_cell_center), Paragraph("Persyaratan Pelayanan", table_cell), Paragraph("3.58", table_cell_center), Paragraph("0.398", table_cell_center), Paragraph("Sangat Baik", table_cell_center)],
        [Paragraph("U2", table_cell_center), Paragraph("Sistem, Mekanisme, dan Prosedur", table_cell), Paragraph("3.54", table_cell_center), Paragraph("0.393", table_cell_center), Paragraph("Sangat Baik", table_cell_center)],
        [Paragraph("U3", table_cell_center), Paragraph("Waktu Penyelesaian Pelayanan", table_cell), Paragraph("3.48", table_cell_center), Paragraph("0.387", table_cell_center), Paragraph("Baik", table_cell_center)],
        [Paragraph("U4", table_cell_center), Paragraph("Biaya / Tarif Pelayanan (Transparansi Retribusi)", table_cell), Paragraph("3.65", table_cell_center), Paragraph("0.406", table_cell_center), Paragraph("Sangat Baik", table_cell_center)],
        [Paragraph("U5", table_cell_center), Paragraph("Produk Spesifikasi Jenis Pelayanan", table_cell), Paragraph("3.56", table_cell_center), Paragraph("0.396", table_cell_center), Paragraph("Sangat Baik", table_cell_center)],
        [Paragraph("U6", table_cell_center), Paragraph("Kompetensi Pelaksana / Petugas Teknis", table_cell), Paragraph("3.52", table_cell_center), Paragraph("0.391", table_cell_center), Paragraph("Sangat Baik", table_cell_center)],
        [Paragraph("U7", table_cell_center), Paragraph("Perilaku Pelaksana (Kesopanan & Keramahan)", table_cell), Paragraph("3.60", table_cell_center), Paragraph("0.400", table_cell_center), Paragraph("Sangat Baik", table_cell_center)],
        [Paragraph("U8", table_cell_center), Paragraph("Penanganan Pengaduan, Saran, dan Masukan", table_cell), Paragraph("3.50", table_cell_center), Paragraph("0.389", table_cell_center), Paragraph("Baik", table_cell_center)],
        [Paragraph("U9", table_cell_center), Paragraph("Kualitas Sarana dan Prasarana Ruang Layanan", table_cell), Paragraph("3.51", table_cell_center), Paragraph("0.390", table_cell_center), Paragraph("Sangat Baik", table_cell_center)],
        [Paragraph("<b>TOTAL</b>", table_cell_bold), Paragraph("<b>Indeks Kepuasan Masyarakat (IKM) Konversi = 88.64</b>", table_cell_bold), Paragraph("<b>3.546</b>", table_cell_bold), Paragraph("<b>3.546</b>", table_cell_bold), Paragraph("<b>A (SANGAT BAIK)</b>", table_cell_bold)]
    ]
    
    t_skm = Table(table_data, colWidths=[1.2*cm, 7.8*cm, 2.7*cm, 2.7*cm, 2.6*cm])
    t_skm.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0F2C59')),
        ('BOX', (0,0), (-1,-1), 1.2, colors.HexColor('#0F2C59')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
        ('BACKGROUND', (0,-1), (-1,-1), colors.HexColor('#FEF3C7')),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    elements.append(t_skm)
    elements.append(Spacer(1, 8))
    
    elements.append(Paragraph("<b>Kesimpulan & Rekomendasi Tindak Lanjut:</b><br/>"
                              "1. Capaian IKM Tahun 2025 sebesar <b>88.64 (Mutu A)</b> menunjukkan tingkat kepuasan publik yang sangat tinggi terhadap transparansi biaya dan keramahan petugas loket.<br/>"
                              "2. Unsur U3 (Waktu Penyelesaian) dan U8 (Penanganan Pengaduan) menjadi fokus akselerasi tahun 2026 melalui integrasi sistem tiket digital dan SOP Maklumat Kompensasi.", body_text))
    elements.append(Spacer(1, 10))
    
    # SIGNATURE
    sig_data = [
        [
            "",
            Paragraph("Pinrang, 31 Desember 2025<br/><br/><b>KEPALA DINAS PERINDUSTRIAN, PERDAGANGAN, ENERGI DAN SUMBER DAYA MINERAL KABUPATEN PINRANG,</b><br/><br/><br/><br/><b><u>MUH. YUSUF NUR, S.STP., M.Si.</u></b><br/>Pembina Utama Muda (IV/c)<br/>NIP. 19780512 199711 1 001", body_text)
        ]
    ]
    t_sig = Table(sig_data, colWidths=[8.0*cm, 9.0*cm])
    t_sig.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('ALIGN', (1,0), (1,0), 'LEFT'),
    ]))
    elements.append(t_sig)
    
    doc.build(elements)
    print(f"Generated Pro SKM: {pdf_path}")

# ==============================================================================
# 3. GENERATE HASIL PENANGANAN PENGADUAN 2025 DARI INFOGRAFIS ASLI TERLAMPIR
# ==============================================================================
def build_laporan_pengaduan_pdf():
    # Gambar infografis asli dari user: 787101977_17923823646406640_1362053036790766049_n.jpg
    src_img = r"d:\# DOWNLOAD\787101977_17923823646406640_1362053036790766049_n.jpg"
    pdf_path = r"d:\# DOWNLOAD\web_disperindagesdm_prototype\assets\documents\pengaduan\hasil-penanganan-pengaduan-2025.pdf"
    
    # Salin gambar ke folder assets
    dest_img = r"d:\# DOWNLOAD\web_disperindagesdm_prototype\assets\documents\pengaduan\infografis_rekapitulasi_pengaduan_2025.jpg"
    im = Image.open(src_img)
    im.save(dest_img, "JPEG", quality=95)
    
    # Buat PDF A4 berisi infografis tajam resolusi penuh
    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=A4,
        rightMargin=0.8*cm,
        leftMargin=0.8*cm,
        topMargin=0.8*cm,
        bottomMargin=0.8*cm
    )
    
    # A4 printable area: 21cm x 29.7cm -> width ~19.4cm, height ~28.1cm
    target_w = 19.4 * cm
    target_h = 19.4 * cm * (im.height / im.width)
    if target_h > 27.5 * cm:
        target_h = 27.5 * cm
        target_w = target_h * (im.width / im.height)
        
    elements = [
        RLImage(dest_img, width=target_w, height=target_h)
    ]
    doc.build(elements)
    print(f"Generated Pro Pengaduan PDF from original infographic: {pdf_path}")

build_sk_kompensasi_pdf()
build_laporan_skm_pdf()
build_laporan_pengaduan_pdf()