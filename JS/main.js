//import ('https://p5js.org/assets/js/p5.min.js')
//import ('https://p5js.org/assets/js/p5.dom.min.js')
//import ('https://p5js.org/assets/js/p5.sound.min.js')

let mic;

function setup(){
  let cnv = createCanvas(100, 100);
  cnv.mousePressed(userStartAudio);
  textAlign(CENTER);
  mic = new p5.AudioIn();
  mic.start();
}

function draw(){
  background(0);
  fill(255);
  text('tap to start', width/2, 20);

  micLevel = mic.getLevel();
  let y = height - micLevel * height;
  ellipse(width/2, y, 10, 10);
}

function record()
{
  background(0);
  micLevel = mic.getLevel();
  ellipse(width/2, constrain(height-micLevel*height*5, 0, height), 10, 10);
}

function addTrack()
{
  alert("This button will add a new melody line to the score");
}

function stop()
{
  alert("This button will stop recording audio");
}

function play()
{
  alert("This button will play the recorded melody");
}

function pause()
{
  alert("This button will pause the recorded melody");
}

setup();
