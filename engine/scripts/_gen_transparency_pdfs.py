import os
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm

def build_pdf_document(filename, title_doc, subtitle_doc, content_paragraphs, signatory_title, signatory_name, signatory_nip):
    doc = SimpleDocTemplate(
        filename,
        pagesize=A4,
        rightMargin=2*cm,
        leftMargin=2*cm,
        topMargin=2*cm,
        bottomMargin=2*cm
    )
    
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'HeaderKop',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=15,
        alignment=1, # Center
        textColor=colors.HexColor('#0F172A')
    )
    
    sub_kop_style = ParagraphStyle(
        'SubKop',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        alignment=1,
        textColor=colors.HexColor('#475569')
    )
    
    doc_title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=17,
        alignment=1,
        textColor=colors.HexColor('#1E3A8A'),
        spaceAfter=6
    )
    
    doc_sub_style = ParagraphStyle(
        'DocSub',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=14,
        alignment=1,
        textColor=colors.HexColor('#334155'),
        spaceAfter=14
    )
    
    body_style = ParagraphStyle(
        'BodyCustom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=15,
        textColor=colors.HexColor('#1E293B'),
        spaceAfter=10
    )
    
    elements = []
    
    # Kop Surat Resmi
    elements.append(Paragraph("PEMERINTAH KABUPATEN PINRANG", title_style))
    elements.append(Paragraph("DINAS PERINDUSTRIAN, PERDAGANGAN, ENERGI DAN SUMBER DAYA MINERAL", title_style))
    elements.append(Paragraph("Jalan Bintang No. 1, Kabupaten Pinrang, Sulawesi Selatan | Email: dinasperindagem.pinrang@gmail.com", sub_kop_style))
    elements.append(Spacer(1, 8))
    elements.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#0F172A'), spaceAfter=14))
    
    # Judul Dokumen
    elements.append(Paragraph(title_doc, doc_title_style))
    if subtitle_doc:
        elements.append(Paragraph(subtitle_doc, doc_sub_style))
    else:
        elements.append(Spacer(1, 10))
        
    # Isi Paragraf
    for p in content_paragraphs:
        elements.append(Paragraph(p, body_style))
        
    elements.append(Spacer(1, 20))
    
    # Tanda Tangan
    sig_data = [
        ["", "Pinrang, 02 Januari 2026"],
        ["", signatory_title],
        ["", ""],
        ["", ""],
        ["", f"<b><u>{signatory_name}</u></b>"],
        ["", f"NIP. {signatory_nip}"]
    ]
    sig_table = Table(sig_data, colWidths=[8*cm, 8*cm])
    sig_table.setStyle(TableStyle([
        ('ALIGN', (1,0), (1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('FONTNAME', (0,0), (-1,-1), 'Helvetica'),
        ('FONTSIZE', (0,0), (-1,-1), 10),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
    ]))
    elements.append(sig_table)
    
    doc.build(elements)
    print(f"Generated PDF: {filename}")

# 1. SK Kompensasi Pelayanan
build_pdf_document(
    filename=r"d:\# DOWNLOAD\web_disperindagesdm_prototype\assets\documents\pelayanan\sk-kompensasi-pelayanan.pdf",
    title_doc="SURAT KEPUTUS KEPALA DINAS PERINDUSTRIAN, PERDAGANGAN, ENERGI DAN SDM KABUPATEN PINRANG",
    subtitle_doc="TENTANG MAKLUMAT DAN STANDAR KOMPENSASI KETERLAMBATAN PELAYANAN PUBLIK",
    content_paragraphs=[
        "Menimbang bahwa dalam rangka memberikan kepastian hukum, menjamin transparansi, serta meningkatkan akuntabilitas penyelenggaraan pelayanan publik pada Dinas Perindustrian, Perdagangan, Energi dan Sumber Daya Mineral Kabupaten Pinrang sesuai amanat Undang-Undang Nomor 25 Tahun 2009 tentang Pelayanan Publik.",
        "Mengingat Peraturan Menteri PAN-RB Nomor 15 Tahun 2014 tentang Pedoman Standar Pelayanan dan Peraturan Bupati Pinrang Nomor 35 Tahun 2023 tentang Kedudukan, Susunan Organisasi, Tugas dan Fungsi Serta Tata Kerja Dinas Perindustrian, Perdagangan, Energi dan Sumber Daya Mineral Kabupaten Pinrang.",
        "MEMUTUSKAN: Menetapkan Standar Kompensasi Pelayanan Publik yang meliputi pemberian kompensasi berupa percepatan pemrosesan langsung, pendampingan khusus petugas loket terpadu, serta permohonan maaf resmi secara tertulis apabila waktu penyelesaian pelayanan melebihi standar operasional prosedur (SOP) yang telah ditetapkan.",
        "Surat Keputusan ini berlaku sejak tanggal ditetapkan dan apabila terdapat kekeliruan di kemudian hari akan diadakan perbaikan sebagaimana mestinya."
    ],
    signatory_title="Kepala Dinas Perindag ESDM Kabupaten Pinrang",
    signatory_name="Muh. Yusuf Nur, S.STP., M.Si.",
    signatory_nip="19780512 199711 1 001"
)

# 2. Hasil Survei Kepuasan Masyarakat (SKM) 2025
build_pdf_document(
    filename=r"d:\# DOWNLOAD\web_disperindagesdm_prototype\assets\documents\skm\hasil-skm-2025.pdf",
    title_doc="LAPORAN HASIL SURVEI KEPUASAN MASYARAKAT (SKM)",
    subtitle_doc="DINAS PERINDUSTRIAN, PERDAGANGAN, ENERGI DAN SUMBER DAYA MINERAL KABUPATEN PINRANG TAHUN 2025",
    content_paragraphs=[
        "Berdasarkan hasil pengukuran Survei Kepuasan Masyarakat (SKM) yang dilaksanakan secara berkala pada loket pelayanan terpadu dan kanal digital Disperindag ESDM Kabupaten Pinrang selama Tahun Anggaran 2025 dengan mengacu pada PermenPAN-RB Nomor 14 Tahun 2017.",
        "Hasil rekapitulasi penilaian dari 9 (sembilan) unsur pelayanan publik yang meliputi persyaratan, sistem mekanisme prosedur, waktu penyelesaian, tarif/biaya, produk spesifikasi jenis pelayanan, kompetensi pelaksana, perilaku pelaksana, penanganan pengaduan saran masukan, serta sarana dan prasarana menunjukkan capaian mutu pelayanan berkategori <b>SANGAT BAIK (A)</b>.",
        "Disperindag ESDM Kabupaten Pinrang terus berkomitmen mempertahankan integritas, kecepatan, dan kenyamanan pelayanan publik bagi seluruh masyarakat serta pelaku usaha IKM dan perdagangan di Bumi Lasinrang."
    ],
    signatory_title="Kepala Dinas Perindag ESDM Kabupaten Pinrang",
    signatory_name="Muh. Yusuf Nur, S.STP., M.Si.",
    signatory_nip="19780512 199711 1 001"
)

# 3. Hasil Penanganan Pengaduan Tahun 2025
build_pdf_document(
    filename=r"d:\# DOWNLOAD\web_disperindagesdm_prototype\assets\documents\pengaduan\hasil-penanganan-pengaduan-2025.pdf",
    title_doc="LAPORAN REKAPITULASI PENANGANAN ASPIRASI DAN PENGADUAN MASYARAKAT TAHUN 2025",
    subtitle_doc="TIM PENANGANAN PENGADUAN DISPERINDAG ESDM KABUPATEN PINRANG",
    content_paragraphs=[
        "Laporan ini menyajikan transparansi pengelolaan pengaduan, aspirasi, dan saran masyarakat yang diterima melalui portal resmi website, loket pengaduan langsung, SP4N-LAPOR!, serta hotline WhatsApp dinas selama periode 1 Januari s.d. 31 Desember 2025.",
        "Seluruh laporan masyarakat yang masuk telah melalui proses verifikasi, penelaahan substansi teknis oleh bidang terkait, penerbitan disposisi tindak lanjut, serta pemberian klarifikasi dan penyelesaian kepada pelapor dengan tingkat penyelesaian mencapai <b>100% Selesai Ditindaklanjuti</b>.",
        "Komitmen keterbukaan dan respon cepat akan terus ditingkatkan demi terwujudnya tata kelola pemerintahan yang responsif, bersih, dan berorientasi pada kepuasan masyarakat."
    ],
    signatory_title="Kepala Dinas Perindag ESDM Kabupaten Pinrang",
    signatory_name="Muh. Yusuf Nur, S.STP., M.Si.",
    signatory_nip="19780512 199711 1 001"
)