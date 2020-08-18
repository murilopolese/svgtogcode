let offsetX
let offsetY
let offsetZ
let safeDistEl
let svgFile
let submit
let preview
let previewText
let gcodeEl
let scaleEl
let safeDist

let offset = [0, 0, 0]
let scaleFactor = 1
let translateAmount = [0, 0, 0]



let gcode = []
function home() {
  gcode.push(`; HOME`)
  gcode.push(`G28`)
}
function make_home() {
  gcode.push(`; SET ORIGING`)
  gcode.push(`G92 X0 Y0 Z0`)
}
function penUp() {
  let safe = parseFloat(offset[2]) + parseFloat(safeDist)
  gcode.push(`G0 Z${safe}`)
}
function penDown() {
  let bedLevel = parseFloat(offset[2])
  gcode.push(`G0 Z${bedLevel}`)
}
function moveTo(x, y) {
  let ox = parseFloat(offset[0])
        + (parseFloat(x||0) * scaleFactor)
        + (parseFloat(translateAmount[0]||0) * scaleFactor)
  let oy = parseFloat(offset[1])
        + (parseFloat(y||0) * scaleFactor)
        + (parseFloat(translateAmount[1]||0) * scaleFactor)

  // console.log('converted', ox, oy)
  gcode.push(`G1 X${ox.toFixed(2)} Y${oy.toFixed(2)}`)
}
function bezier(i, j, p, q, x, y) {
  let I = parseFloat(offset[0])
        + (parseFloat(j||0) * scaleFactor)
        + (parseFloat(translateAmount[0]||0) * scaleFactor)
  let J = parseFloat(offset[1])
        + (parseFloat(j||0) * scaleFactor)
        + (parseFloat(translateAmount[1]||0) * scaleFactor)

  let X = parseFloat(offset[0])
        + (parseFloat(x||0) * scaleFactor)
        + (parseFloat(translateAmount[0]||0) * scaleFactor)
  let Y = parseFloat(offset[1])
        + (parseFloat(y||0) * scaleFactor)
        + (parseFloat(translateAmount[1]||0) * scaleFactor)

  let P = parseFloat(offset[0])
        + (parseFloat(p||0) * scaleFactor)
        + (parseFloat(translateAmount[0]||0) * scaleFactor)
  P -= X
  let Q = parseFloat(offset[1])
        + (parseFloat(q||0) * scaleFactor)
        + (parseFloat(translateAmount[1]||0) * scaleFactor)
  Q -= Y

  X = X.toFixed(2)
  Y = Y.toFixed(2)
  I = I.toFixed(2)
  J = J.toFixed(2)
  P = P.toFixed(2)
  Q = Q.toFixed(2)
  gcode.push(`G5 I${I} J${J} P${P} Q${Q} X${X} Y${Y}`)
  // gcode.push(`G5 I${I} J${J} P${P} Q${Q} X${X} Y${Y}`)
}

function translate(x, y) {
  console.log('translatex', x, y)
  translateAmount = [parseFloat(x), parseFloat(y)]
}

function rotate() {
  // console.log('rotate', arguments)
}

function scale() {
  // console.log('scale', arguments)
}

window.onload = function() {
  offsetX = document.querySelector('input[name="offsetx"]')
  offsetY = document.querySelector('input[name="offsety"]')
  offsetZ = document.querySelector('input[name="offsetz"]')
  safeDistEl = document.querySelector('input[name="safe_dist"]')
  svgFile = document.querySelector('input[name="svg_file"]')
  submit = document.querySelector('input[type="submit"]')
  preview = document.querySelector('.preview')
  previewText = document.querySelector('.preview-text')
  gcodeEl = document.querySelector('.gcode')
  scaleEl = document.querySelector('input[name="scale"]')

  // Run!
  function getNumber(val) {
    return parseFloat (val||0)
  }
  submit.addEventListener('click', function() {
    translateAmount = [0, 0, 0]
    safeDist = getNumber(safeDistEl.value)
    scaleFactor = getNumber(scaleEl.value)||1
    offset = [
      getNumber(offsetX.value),
      getNumber(offsetY.value),
      getNumber(offsetZ.value)
    ]
    // processFile().then(function(file) {
    //   preview.innerHTML = file
    //   previewText.innerHTML = file
    //   return parseSVG(file)
    // })
    parseSVG()
  })
}

function processFile() {
  return new Promise((resolve, reject) => {
    let reader = new FileReader()
    reader.readAsArrayBuffer(svgFile.files[0])
    reader.onload = function (evt) {
      // console.log(evt.target.result)
      let encoder = new TextDecoder("utf-8")
      resolve(encoder.decode(evt.target.result));
    }
    reader.onerror = function (evt) {
      // console.log(evt)
      reject(new Error("error reading file"));
    }
  })
}

function parseSVG() {
  const parser = new DOMParser()
  let doc = parser.parseFromString(previewText.value, 'image/svg+xml')
  let walker = document.createTreeWalker(
    doc,
    NodeFilter.SHOW_ELEMENT,
    { acceptNode: function(node) { return NodeFilter.FILTER_ACCEPT; } },
    false
  )
  let node = walker.nextNode()
  gcode = []
  home()
  penUp()
  while(node) {
    switch (node.tagName.toLowerCase()) {
      case 'path':
        let SVGPathData = svgpathdata.SVGPathData
        let data = new SVGPathData(node.getAttribute('d')).toAbs()
        let commands = data.commands.map(function(c) {
          switch (c.type) {
            case SVGPathData.MOVE_TO:
              penUp()
              moveTo(c.x, c.y)
            case SVGPathData.LINE_TO:
              penDown()
              moveTo(c.x, c.y)
              break;
            case SVGPathData.ARC:
              console.log(c)
              // moveTo(c.x, c.y)
              break;
            case SVGPathData.QUAD_TO:
              console.log(c)
              // moveTo(c.x, c.y)
              break;
            case SVGPathData.CURVE_TO:
              bezier(c.x1, c.y1, c.x2, c.y2, c.x, c.y)
              console.log(c)
              // moveTo(c.x, c.y)
              break;
            default:
          }
        })

        break;
      case 'g':
        // console.log(node)
        if (node.getAttribute('transform')) {
          let transform = node.getAttribute('transform').split(' ')
          transform.forEach((fn) => {
            // console.log('transform', fn)
            eval(fn)
          });
        }
        break;
      default:
    }
    node = walker.nextNode()
  }
  penUp()
  gcodeEl.innerText = (gcode.join('\n'))
  selectText(gcodeEl)
}

function selectText(el) {
    if (document.selection) { // IE
        var range = document.body.createTextRange();
        range.moveToElementText(el);
        range.select();
    } else if (window.getSelection) {
        var range = document.createRange();
        range.selectNode(el);
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);
    }
}
