const handpose = require('@tensorflow-models/handpose');
require('@tensorflow/tfjs-backend-webgl');
var model;
const flipHorizontal = false;

async function loadModel() {
  model = await handpose.load();
  console.log('handpose model is loaded.');
}

async function detect(frame) {
  if (!model) {
    console.log('handpose model has not been loaded.');
    return;
  }
  var start = new Date();
  const predictions = await model.estimateHands(
    frame,
    flipHorizontal
  );
  var end = new Date() - start;
  console.log('detect', end, 'ms');

  return { prediction: predictions };
}

module.exports = { loadModel, detect };
