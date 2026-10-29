// CRA loads this only in its development server. Nothing is copied into public.
const path = require('node:path');
const { assets, validate, staging } = require('../scripts/local-meshy.cjs');
module.exports = function localMeshy(app) {
  app.use('/__local-meshy', (req, res) => {
    if (process.env.NODE_ENV !== 'development' || process.env.REACT_APP_MAZE_VISUAL_INTEGRATION !== 'true' ||
        process.env.REACT_APP_MAZE_CHARACTER_ART !== 'meshy-local') return res.sendStatus(404);
    try {
      const selected = assets(process.env.REACT_APP_MAZE_CHARACTER_SOURCE || 'boy');
      const entry = selected.find(a => '/' + path.basename(a.file) === req.path);
      if (!entry || !['GET', 'HEAD'].includes(req.method)) return res.sendStatus(404);
      const bytes = validate(path.join(staging, path.basename(entry.file)), entry);
      res.set('Cache-Control', 'no-store').type('png').send(bytes);
    } catch (_) { res.sendStatus(404); }
  });
};
