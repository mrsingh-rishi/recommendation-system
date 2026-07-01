import express from 'express';
import vendorRatingsRouter from './routes/vendor-ratings.js';
import vendorDocumentsRouter from './routes/vendor-documents.js';
import workRequirementsRouter from './routes/work-requirements.js';
import vendorRouter from './routes/vendor.js';
const app = express();


app.get('/', (req, res) => {
  res.send('Hello, World!');
})

app.use('/api/vendor-ratings', vendorRatingsRouter);
app.use('/api/vendor-documents', vendorDocumentsRouter);
app.use('/api/work-requirements', workRequirementsRouter);
app.use('/api/vendor', vendorRouter);



app.listen(3000, () => {
  console.log('Server is running on port 3000');
})
