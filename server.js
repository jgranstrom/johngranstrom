const express = require('express');
const compression = require('compression');
const path = require('path');
const morgan = require('morgan');

const app = express();

app.disable('x-powered-by');
app.use(morgan('short'));
app.use(compression());

app.use('/dist', express.static(path.join(__dirname, 'dist'), {
  maxage: '30d',
}));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});;

const port = process.env.PORT || 1235;
app.listen(port, () => {
  console.log(`Listening to ${port}`);
});
