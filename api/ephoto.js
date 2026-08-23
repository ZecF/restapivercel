const { ephotoMaker } = require('../lib/ephotomaker');

module.exports = async function (req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'GET') {
    return res.status(405).json({ status: false, message: 'Method tidak diizinkan. Gunakan GET.' });
  }

  const { effect, text } = req.query;

  if (!effect || !text) {
    return res.status(400).json({ 
      status: false, 
      message: "Parameter wajib diisi! Contoh: /api/ephoto?effect=pubg-logo&text=Dimas" 
    });
  }

  try {
    const result = await ephotoMaker(effect, text);
    if (result.status === 'success' || result.status === true) {
      return res.status(200).json(result);
    } else {
      return res.status(500).json({ status: false, message: result.message || 'Gagal memproses gambar.' });
    }
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
};
    
