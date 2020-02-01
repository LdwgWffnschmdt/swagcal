// optional: allow environment to specify port
const port = process.env.PORT || 8080;

// wire up the module
var express = require('express');
var cors = require('cors');

// create server instance
const app = express();

app.use(cors());

// bind the request to an absolute path or relative to the CWD
app.use(express.static('dist'));
// start the server
app.listen(port, () => console.log(`Listening on port ${port}`));