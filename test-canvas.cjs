const { createCanvas } = require('canvas');
const fs = require('fs');

const canvas = createCanvas(200, 100);
const ctx = canvas.getContext('2d');
ctx.fillStyle = 'red';
ctx.fillRect(0, 0, 200, 100);
const buffer = canvas.toBuffer('image/jpeg');
fs.writeFileSync('test.jpg', buffer);
console.log('Success');
