document.getElementById('imageLoader').addEventListener('change', handleImage, false);
document.addEventListener('keydown', handleDelete, false);
const canvasElem = document.getElementById('canvas');
const outputDiv = document.getElementById('output');
const infoDiv = document.getElementById('info');

const snapTo = 10; // Pvz., 10px
const pricePerSquare = 25; // 50 x 50 cm ploto kaina
const sqareSize = 0.25; // Ikainojamas plotas m2

let canvasWidth = canvasElem.width; // Canvas plotis
let canvasHeight = canvasElem.height; // Canvas aukštis

let gridRows = canvasWidth / snapTo; // GRID eilučių skaičius
let gridCols = canvasHeight / snapTo; // GRID stulpelių skaičius

let canvas = new fabric.Canvas('canvas', {
    hoverCursor: 'pointer',
    selection: true,
    backgroundColor: 'white',
    width: canvasWidth,
    height: canvasHeight
});

let imageInfoArray = []; // Masyvas saugoti paveikslėlių informacijai
let preloadImgCount = 0; // Kintamasis saugoti užkrautų paveikslėlių skaičių

function drawGrid() {
    const gridCellWidth = canvasWidth / gridRows;
    const gridCellHeight = canvasHeight / gridCols;

    for (let i = 0; i < gridRows; i++) {
        for (let j = 0; j < gridCols; j++) {
            const rect = new fabric.Rect({
                left: i * gridCellWidth,
                top: j * gridCellHeight,
                width: gridCellWidth,
                height: gridCellHeight,
                fill: (i + j) % 2 === 0 ? 'lightgrey' : 'white',
                selectable: false,
                hoverCursor: 'default'
            });
            canvas.add(rect);
            canvas.sendToBack(rect);
        }
    }
}

function handleImage(e) {
    const reader = new FileReader();
    reader.onload = function (event) {
        const imgObj = new Image();
        imgObj.src = event.target.result;
        imgObj.onload = function () {
            const image = new fabric.Image(imgObj);
            const scale = Math.min(100 / imgObj.width, 100 / imgObj.height);
            const objectId = new Date().getTime();
            image.set({
                scaleX: scale,
                scaleY: scale,
                originX: 'center',
                originY: 'center',
                id: objectId,
                transparentCorners: false,
                borderColor: 'black',
                cornerColor: 'white',
                cornerStrokeColor: 'black'
            });

            canvas.add(image).setActiveObject(image);
            canvas.centerObject(image);

            addToImageList(image, scale, objectId, null,  e.target.files[0].name);
            updateInfo();
            displayImageInfo();
        }
    }
    reader.readAsDataURL(e.target.files[0]);
}

function getArea(width, height) {
    return (width / 100) * (height / 100);
}

function calculateCost(area) {
    // Apskaičiuojama kaina 25 eurų tikslumu
    let cost = Math.ceil((area * pricePerSquare) / (sqareSize * 25)) * 25;
    return Math.max(cost, 25); // Užtikrinama, kad minimali kaina yra 25 eurai
}

function updateInfo() {
    const activeObject = canvas.getActiveObject();
    if (!activeObject) return;

    const scaleX = activeObject.scaleX;
    const scaleY = activeObject.scaleY;
    const width = (activeObject.width * scaleX) * 5 / 10; // Išmatavimai cm
    const height = (activeObject.height * scaleY) * 5 / 10; // Išmatavimai cm
    const area = getArea(width, height); // Plotas m²
    const aspectRatio = (width / height).toFixed(2);
    let cost = calculateCost(area);

    const info = imageInfoArray.find(info => info.id === activeObject.id);
    if (info) {
        info.width = width.toFixed(2);
        info.height = height.toFixed(2);
        info.area = area.toFixed(2);
        info.aspectRatio = aspectRatio;
        info.cost = cost.toFixed(2);
        info.left = activeObject.left;
        info.top = activeObject.top;
    }

    infoDiv.innerHTML = `€${cost.toFixed(2)}`;

    // Atnaujinama informacija naršyklės lange
    displayImageInfo();
}

function displayImageInfo() {
    outputDiv.innerHTML = ''; // Išvaloma ankstesnė informacija
    let totalCost = 0;
    imageInfoArray.forEach(function (info) {
        var content = `ID: ${info.id}, Name: ${info.name}, Width: ${info.width} cm, Height: ${info.height} cm, Area: ${info.area} m2, Aspect Ratio: ${info.aspectRatio}, Cost: €${info.cost}, Left: ${info.left.toFixed()}, Top: ${info.top.toFixed()}<br>`;
        outputDiv.innerHTML += content;
        totalCost += Number(info.cost);
    });
    setTotalCost(totalCost);
}

function setTotalCost (totalCost = 0) {
    const totalCostElement = document.getElementById('totalCost');
    totalCostElement.innerHTML = `Total cost: € ${totalCost}`;
}

canvas.on('object:scaling', function (e) {
    var obj = e.target;

    // Apskaičiuojamas maksimalus skalėjimo koeficientas
    var maxScaleX = canvasWidth / obj.width;
    var maxScaleY = canvasHeight / obj.height;

    // Ribojamas objekto skalėjimas
    if (obj.scaleX > maxScaleX) {
        obj.scaleX = maxScaleX;
    }
    if (obj.scaleY > maxScaleY) {
        obj.scaleY = maxScaleY;
    }

    updateInfo();
    costDivPossition(obj);
});

canvas.on('object:moving', function (e) {
    const obj = e.target;
    obj.set({
        left: Math.round(obj.left / snapTo) * snapTo,
        top: Math.round(obj.top / snapTo) * snapTo
    });
    updateInfo();
    costDivPossition(obj);
});

function costDivPossition(target) {
    // Apskaičiuojama infoDiv pozicija
    let targetTop = getOffset(canvasElem).top + target.get('top');
    let targetLeft = getOffset(canvasElem).left + target.get('left') - 25;

    infoDiv.style.position = 'absolute';
    infoDiv.style.top = targetTop + 'px'; // Nustatoma infoDiv viršutinė pozicija
    infoDiv.style.left = targetLeft + 'px'; // Nustatoma infoDiv kairinė pozicija
    infoDiv.style.display = 'grid';
}

canvas.on('mouse:over', function(e) {
    const target = e.target;
    if (!target || target.get('selectable') === false) return;
    costDivPossition(target);
});

canvas.on('mouse:out', function(e) {
    const target = e.target;
    if (!target || target.get('selectable') === false) return;

    infoDiv.style.display = 'none';
});

function getOffset(el) {
    const rect = el.getBoundingClientRect();
    return {
        left: rect.left + window.scrollX,
        top: rect.top + window.scrollY
    };
}

function handleDelete(e) {
    if (e.key === 'Delete') {
        const activeObject = canvas.getActiveObject();
        if (activeObject) {
            // Pašalinamas objektas iš canvas
            canvas.remove(activeObject);

            // Pašalinamas atitinkamas įrašas iš imageInfoArray
            const index = imageInfoArray.findIndex(info => info.id === activeObject.id);

            if (index > -1) {
                imageInfoArray.splice(index, 1);
                // Atnaujinama informacija naršyklės lange
                displayImageInfo();
            }
            infoDiv.innerHTML = '';
        }
    }
}

function addToImageList(image, scale, objectId, area, name) {
    const imgWidth = image.width * scale;
    const imgHeight = image.height * scale;
    // Įrašome pradinę informaciją į masyvą
    imageInfoArray.push({
        id: objectId,
        name: name, // Galite pakeisti pavadinimą
        width: imgWidth.toFixed(2),
        height: imgHeight.toFixed(2),
        area: area ? area.toFixed(2) : null,
        aspectRatio: (imgWidth / imgHeight).toFixed(2),
        cost: calculateCost(area),
        left: image.left,
        top: image.top
    });
}

function preloadImage(imageUrl) {
    const imgObj = new Image();
    imgObj.src = imageUrl;
    imgObj.onload = function() {
        preloadImgCount++;
        const image = new fabric.Image(imgObj);
        const scale = Math.min(100 / imgObj.width, 100 / imgObj.height);
        const objectId = new Date().getTime()  + preloadImgCount;
        const area = getArea(image.width, image.height);
        const name = `Preloaded Image ${preloadImgCount}`;

        image.set({
            id: objectId,
            scaleX: scale,
            scaleY: scale,
            originX: 'center',
            originY: 'center',
            transparentCorners: false,
            borderColor: 'black',
            cornerColor: 'white',
            cornerStrokeColor: 'black'
        });

        canvas.add(image).setActiveObject(image);
        canvas.centerObject(image);
        addToImageList(image, scale, objectId, area, name);
        updateInfo();
        displayImageInfo();
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // drawGrid();
    preloadImage('gruda.png');
    preloadImage('v_logo.png');
    preloadImage('Logo_sveskimevaikyste-768x684.png');
});
