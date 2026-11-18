const { createApp } = require('./app');
const port = process.env.PORT || 3001;
createApp().listen(port, () => console.log(`product-service listening on ${port}`));
