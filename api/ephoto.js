const { Ephoto360 } = require('../lib/ephotomaker');
const client = new Ephoto360(); // Inisialisasi class Ephoto360

module.exports = async function (req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'GET') {
    return res.status(405).json({ status: false, message: 'Gunakan method GET.' });
  }

  const { effect, text } = req.query;

  if (!effect || !text) {
    return res.status(400).json({ 
      status: false, 
      message: "Parameter wajib diisi! Contoh: ?effect=https://en.ephoto360.com/pubg-logo-maker-online-free-557.html&text=Dimas" 
    });
  }

  try {
    // Memanggil fungsi generate dari script pochi dengan parameter { texts: [text] }
    const result = await client.generate(effect, { texts: [text] });
    
    if (result.success) {
      return res.status(200).json({
        status: true,
        imageUrl: result.image_url
      });
    } else {
      return res.status(500).json({ status: false, message: result.info });
    }
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
};
