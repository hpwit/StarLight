// @title     StarBase
// @file      app.js
// @date      20240720
// @repo      https://github.com/ewowi/StarBase
// @Authors   https://github.com/ewowi/StarBase/commits/main
// @Copyright © 2024 Github StarBase Commit Authors
// @license   GNU GENERAL PUBLIC LICENSE Version 3, 29 June 2007
// @license   For non GPL-v3 usage, commercial licenses must be purchased. Contact moonmodules@icloud.com

function appName() {
  return "Led";
}

function userFunSetup() {
  let body = gId("body");

  body.innerHTML += `<div id="canvasMenu" style="position:absolute;display:none"> <!--;background-color:#b60f62-->
    <p><button id="canvasButton1"></button></p>
    <p><button id="canvasButton2"></button></p>
    <p><button id="canvasButton3"></button></p>
    <span id="canvasData" hidden="true"></span>
  </div>`
}

function userFun(buffer) {
  if (buffer[0]==1) {
    let canvasNode = gId("pview");

    if (canvasNode) {
      let pviewVar = controller.modules.findVar("pview");
  
      //replace the canvas: in case we switch from 2D to 3D as they cannot be reused between them
      //not needed anymore as we do only three.js
      // if (pviewVar.file.new)
      // {
      //   console.log("replace the canvas!", pviewVar.file);
      //   let canvasNode = cE("canvas");
      //   canvasNode.width = pviewNode.width;
      //   canvasNode.height = pviewNode.height;
      //   canvasNode.className = pviewNode.className;
      //   canvasNode.draggable = true;
      //   canvasNode.addEventListener('dragstart', (event) => {event.preventDefault(); event.stopPropagation();});

      //   pviewNode.parentNode.replaceChild(canvasNode, pviewNode);
      //   pviewNode = canvasNode;
      //   pviewNode.id = "pview";
      //   pviewNode.addEventListener('dblclick', (event) => {toggleModal(event.target);});
      // }

      // console.log("userFun", buffer, pviewVar);

      // if (pviewVar.file.depth == 1)
      //   preview2D(pviewNode, buffer, pviewVar);
      // else
        preview3D(canvasNode, buffer, pviewVar);

    }
    return true;
  }
  
  return false;
}

function preview2D(canvasNode, buffer, pviewVar) {
  let ctx = canvasNode.getContext('2d');
  let i = 5;
  let factor = 10;//fixed value: from mm to cm
  ctx.clearRect(0, 0, canvasNode.width, canvasNode.height);
  if (pviewVar.file) {
    let pPL = Math.min(canvasNode.width / pviewVar.file.width, canvasNode.height / pviewVar.file.height); // pixels per LED (width of circle)
    let lOf = Math.floor((canvasNode.width - pPL*pviewVar.file.width)/2); //left offeset (to center matrix)
    if (pviewVar.file.outputs) {
      // console.log("preview2D jsonValues", pviewVar.file);
      for (var output of pviewVar.file.outputs) {
        if (output.buffer) {
          for (var led of output.buffer) {
            if (buffer[i] + buffer[i+1] + buffer[i+2] > 20) { //do not show nearly blacks
              ctx.fillStyle = `rgb(${buffer[i]},${buffer[i+1]},${buffer[i+2]})`;
              ctx.beginPath();
              ctx.arc(led[0]*pPL/factor + lOf, led[1]*pPL/factor, pPL*0.4, 0, 2 * Math.PI);
              ctx.fill();
            }
            i+=3;
          }
        }
        else {
          console.log("preview2D jsonValues no leds", pviewVar.file);
          pviewVar.file = null;
        }            
      }
    }
    else {
      console.log("preview2D jsonValues no outputs", pviewVar.file);
      pviewVar.file = null;
    }
    pviewVar.file.new = null;
  }
}

let renderer = null;
let scene = null;
let camera = null;
var controls = null;
let raycaster = null;
let intersect = null;
let mousePointer = null;

//https://stackoverflow.com/questions/8426822/rotate-camera-in-three-js-with-mouse

//inspiration: https://discoverthreejs.com/book/first-steps/transformations/
function preview3D(canvasNode, buffer, pviewVar) {
  //3D vars
  import ('three').then((THREE) => {

    function onMouseMove( event ) {

      let canvasRect = canvasNode.getBoundingClientRect();
    
      if (!mousePointer) mousePointer = new THREE.Vector2();
      mousePointer.x = ((event.clientX - canvasRect.left) / canvasRect.width) * 2 - 1;
      mousePointer.y = -((event.clientY - canvasRect.top) / canvasRect.height) * 2 + 1;

      let canvasMenuRect = gId("canvasMenu").getBoundingClientRect();

      // console.log(event.clientX, event.clientY, canvasMenuRect);

      //if mousePointer out of menu bounds then hide menu
      if (event.clientX < canvasMenuRect.left || event.clientX > canvasMenuRect.right || event.clientY < canvasMenuRect.top || event.clientY > canvasMenuRect.bottom)
        gId("canvasMenu").style.display = "none";
    }
    
    function onMouseDown(event) {
      event.preventDefault();
      // var rightclick;
      // if (!event) var event = window.event;
      // if (event.which) rightclick = (event.which == 3);
      // else if (event.button) rightclick = (event.button == 2);
      // if (!rightclick) return;
      
      // var intersects = raycaster.intersectObjects(scene.children);
      console.log("onMouseDown", event, intersect);
    
      if (intersect) {
        // intersect = intersects[0].object;
        gId("canvasMenu").style.left = (event.clientX) + "px"; // - rect.left
        gId("canvasMenu").style.top = (event.clientY) + "px"; //- rect.top
        gId("canvasMenu").style.display = ""; //not none -> show
        let sp = intersect.name.split(" - "); //output and led index is encoded in the name
        gId("canvasData").innerText = pviewVar.file.outputs[sp[0]].leds[sp[1]];// event.clientY;
      }
      // else{
      //   intersect = undefined;
      // }
    }
    
    import ('three/addons/controls/OrbitControls.js').then((OCModule) => {

      let factor = 10;//fixed value: from mm to cm
      let d = 5 / factor; //distanceLED;

      //init three - done once
      if (!renderer || (pviewVar.file && pviewVar.file.new)) { //init 3D

        console.log("preview3D create new renderer");

        renderer = new THREE.WebGLRenderer({canvas: canvasNode, antialias: true, alpha: true });
        // THREE.Object3D.DefaultUp = new THREE.Vector3(0,1,1);
        renderer.setClearAlpha(0)
        renderer.setClearColor( 0x000000, 0 );

        camera = new THREE.PerspectiveCamera( 45, canvasNode.width/canvasNode.width, 1, 500); //aspectRatio is 1 for the time being
        camera.position.set( 0, 0, d*Math.sqrt(pviewVar.file.width*pviewVar.file.width + pviewVar.file.height*pviewVar.file.height + pviewVar.file.depth*pviewVar.file.depth) );
        camera.lookAt( 0, 0, 0 );

        scene = new THREE.Scene();
        scene.background = null; //new THREE.Color( 0xff0000 );

        controls = new OCModule.OrbitControls( camera, renderer.domElement );
        controls.target.set( 0, 0.5, 0 );
        controls.update();
        controls.enablePan = false;
        controls.enableDamping = true;

        raycaster = new THREE.Raycaster();

        canvasNode.addEventListener( 'mousemove', onMouseMove );
        canvasNode.addEventListener('mousedown', onMouseDown, false);
        //prevent default behavior
        // if (gId("canvasMenu").addEventListener) {
        //   gId("canvasMenu").addEventListener('contextmenu', function (e) {
        //     console.log("canvasMenu contextmenu", e);
        //     e.preventDefault();
        //   }, false);
        // } else {
        //   gId("canvasMenu").attachEvent('oncontextmenu', function () {
        //     console.log("canvasMenu oncontextmenu", window);
        //     window.event.returnValue = false;
        //   });
        // }

        gId("canvasButton1").innerText = "Set Start position";
        gId("canvasButton2").innerText = "Set End position";
        gId("canvasButton3").innerText = "Set Mid position";

        //process canvas button click
        gId("canvasButton1").addEventListener("click", function(){
          var command = {};
          command["canvasData"] = "start:" + gId("canvasData").innerText;
          requestJson(command);

          gId("canvasMenu").style.display = "none";
        }, false);
        gId("canvasButton2").addEventListener("click", function(){
          var command = {};
          command["canvasData"] = "end:" + gId("canvasData").innerText;
          requestJson(command);
          gId("canvasMenu").style.display = "none";
        }, false);
        gId("canvasButton3").addEventListener("click", function(){
          var command = {};
          command["canvasData"] = "mid:" + gId("canvasData").innerText;
          requestJson(command);
          gId("canvasMenu").style.display = "none";
        }, false);
        
      } //new

      //init fixture - anytime a new fixture
      if (pviewVar.file && pviewVar.file.new) { //set the new coordinates
        var offset_x = -d*(pviewVar.file.width-1)/2;
        var offset_y = -d*(pviewVar.file.height-1)/2;
        var offset_z = -d*(pviewVar.file.depth-1)/2;

        console.log("preview3D new jsonValues", pviewVar.file);

        if (pviewVar.file.outputs) {
          // console.log("preview3D jsonValues", pviewVar.file);
          let outputsIndex = 0;
          for (var output of pviewVar.file.outputs) {
            if (output.leds) {
              let ledsIndex = 0;
              for (var led of output.leds) {
                if (led.length == 1) //1D: make 2D
                  led.push(0);
                if (led.length <= 2) //1D and 2D: maak 3D 
                  led.push(0);

                // ppf("size and shape", pviewVar.file.ledSize, pviewVar.file.shape);
                if (!pviewVar.file.ledSize) pviewVar.file.ledSize = 7;
                  
                let geometry;
                if (pviewVar.file.shape == 1)
                  geometry = new THREE.TetrahedronGeometry(pviewVar.file.ledSize / 30); //was 1/factor
                else // default
                  geometry = new THREE.SphereGeometry(pviewVar.file.ledSize / 30); //was 1/factor
                const material = new THREE.MeshBasicMaterial({transparent: true, opacity: 1.0});
                // material.color = new THREE.Color(`${x/mW}`, `${y/mH}`, `${z/mD}`);
                const mesh = new THREE.Mesh( geometry, material );
                mesh.position.set(offset_x + d*led[0]/factor, -offset_y - d*led[1]/factor, - offset_z - d*led[2]/factor);
                mesh.name = outputsIndex + " - " + ledsIndex++;
                scene.add( mesh );
              }
            }
            else {
              console.log("preview3D jsonValues no leds", pviewVar.file);
              pviewVar.file = null;
            }
            outputsIndex++;
          } //outputs
        }
        else {
          console.log("preview3D jsonValues no outputs", pviewVar.file);
          pviewVar.file = null;
        }
        pviewVar.file.new = null;
      }

      //animate / render
      if (pviewVar.file) {
        //https://stackoverflow.com/questions/29884485/threejs-canvas-size-based-on-container
        if (canvasNode.width != canvasNode.clientWidth) { //} || canvasNode.height != canvasNode.clientHeight) {
          console.log("3D pview update size", canvasNode.width, canvasNode.clientWidth, canvasNode.height, canvasNode.clientHeight);
          renderer.setSize(canvasNode.clientWidth, canvasNode.clientWidth, false); //Setting updateStyle to false prevents any style changes to the output canvas.
        }

        //light up the cube
        let headerBytes = 4;
        var i = 0;
        let rgb1B = pviewVar.file.nrOfLeds == buffer.length - headerBytes; //1-byte rgb
        // console.log(pviewVar.file.nrOfLeds, buffer.length);
        if (pviewVar.file.outputs) {
          // console.log("preview3D jsonValues", pviewVar.file);
          for (var output of pviewVar.file.outputs) {
            if (output.leds) {
              for (var led of output.leds) {
                if (i < scene.children.length) {
                  if (rgb1B) {
                    let bte = buffer[headerBytes + i];
                    //decode rgb from 8 bits: 3 for red, 3 for green, 2 for blue
                    scene.children[i].material.color = new THREE.Color(`${((bte & 0xE0) >> 5)*32/256}`, `${((bte & 0x1C) >> 2)*32/256}`, `${(bte & 0x03)*64/256}`);
                  }
                  else {
                    // scene.children[i].visible = buffer[headerBytes + i*3] + buffer[headerBytes + i*3 + 1] + buffer[headerBytes + i*3 + 2] > 10; //do not show blacks
                    // if (scene.children[i].visible) {
                      scene.children[i].material.color = new THREE.Color(`${buffer[headerBytes + i*3]/255}`, `${buffer[headerBytes + i*3 + 1]/255}`, `${buffer[headerBytes + i*3 + 2]/255}`);
                      // scene.children[i].geometry.setAtttribute("radius", buffer[4] / 30);
                    // }
                  }
                }
                i++;
              }
            }
            else {
              console.log("preview3D jsonValues no leds", pviewVar.file);
              pviewVar.file = null;
            }
          }
        }
        else {
          console.log("preview3D jsonValues no outputs", pviewVar.file);
          pviewVar.file = null;
        }
      }

      // controls.rotateSpeed = 0.4;
      //moving heads rotation
      scene.rotation.x = buffer[1] / 255 * Math.PI * 2;
      scene.rotation.y = buffer[2] / 255 * Math.PI * 2;
      scene.rotation.z = buffer[3] / 255 * Math.PI * 2;

      controls.update(); // apply orbit controls

      if (mousePointer) {
        raycaster.setFromCamera( mousePointer, camera );
  
        const intersects = raycaster.intersectObjects( scene.children, true ); //recursive
        
        if ( intersects.length > 0 ) {
          // console.log(raycaster, intersects, mousePointer, scene.children);
  
          if ( intersect != intersects[ 0 ].object ) {
  
            if ( intersect ) intersect.material.color.setHex( intersect.currentHex );
  
            intersect = intersects[ 0 ].object;
            intersect.currentHex = intersect.material.color.getHex();
            intersect.material.color.setHex( 0xff0000 ); //red
  
          }
  
        } else {
  
          if ( intersect ) intersect.material.color.setHex( intersect.currentHex );
  
          intersect = null;
  
        }
      } //if mousePointer
      
      renderer.render( scene, camera);
    }); //import OrbitControl
  }); //import Three
} //preview3D