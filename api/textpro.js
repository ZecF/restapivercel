const { textMaker } = require('../lib/textmaker');

module.exports = async function (req, res) {
  // Set header agar outputnya rapi berupa JSON
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'GET') {
    return res.status(405).json({ status: false, message: 'Method tidak diizinkan. Gunakan GET.' });
  }

  // 1. Tambahkan penangkap parameter text2
  const { effect, text, text2 } = req.query;

  if (!effect || !text) {
    return res.status(400).json({ 
      status: false, 
      message: "Parameter wajib diisi! Contoh: /api/textpro?effect=pornhub&text=Halo&text2=Dimas" 
    });
  }

  try {
    // 2. Jika ada text2, gabungkan menjadi array. Jika tidak ada, tetap jadi array berisi 1 teks.
    const inputTexts = text2 ? [text, text2] : [text];

    // 3. Kirimkan inputTexts (yang sudah berbentuk array) ke textMaker
    const result = await textMaker(effect, inputTexts);
    
    if (result.status === 'success' || result.status === true) {
      return res.status(200).json(result);
    } else {
      return res.status(500).json({ status: false, message: result.message || 'Gagal memproses gambar.' });
    }
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
};

      
