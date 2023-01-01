// TODO: CREDIT https://www.onlinelabels.com/clip-art/Chess_symbols_set-100629 Igor Krizanovskij for chess clip art

let localPlayingField = []
let localMoveList = []
let localPieceColor = pe.WHITE
let localBoardId = undefined

let localUserId = undefined

let initPos_x, initPos_y
let isClicked = false

// get clicked field, and highlight it
function moveStart() {

}

// get other field, and move the piece there
function moveEnd() {

}

function addClickListener() {

}

function drawBoard() {

    // for some reason the '/div' gets added automatically, I cannot control it.
    let html_new_row = '<div class="chess-row flex-container" id="',
        html_end_row = '">',
        html_new_cell = '<div class="chess-box" id="',
        html_end_cell = '">'

    document.getElementById('game-board').innerHTML = ""
    for (let ver = 0; ver < 8; ver++) {

        let ver_real = String(ver + 1);
        document.getElementById('game-board').innerHTML += (html_new_row + ver_real + html_end_row);

        for (let hor = 0; hor < 8; hor++) {
            let pieceId = localPlayingField[ver][hor]

            let filename = undefined

            switch (pieceId) {
                // this has to be this long, every image has an unique filename
                case pe.W_Q:
                    filename = 'w_q'
                    break
                case pe.W_K:
                    filename = 'w_k'
                    break
                case pe.W_R:
                    filename = 'w_r'
                    break
                case pe.W_N:
                    filename = 'w_n'
                    break
                case pe.W_B:
                    filename = 'w_b'
                    break
                case pe.W_P:
                    filename = 'w_p'
                    break

                case pe.B_Q:
                    filename = 'b_q'
                    break
                case pe.B_K:
                    filename = 'b_k'
                    break
                case pe.B_R:
                    filename = 'b_r'
                    break
                case pe.B_N:
                    filename = 'b_n'
                    break
                case pe.B_B:
                    filename = 'b_b'
                    break
                case pe.B_P:
                    filename = 'b_p'
                    break
            }

            let rawFilename = filename
            filename = 'resources/' + filename + '.png'

            console.log('loaded file: ' + filename)

            let html_piece_new_img = '<img draggable="false" (dragstart)="false;" class="piece-img" src="'
            let html_piece_end_img = '">'


            let hor_real = String.fromCharCode('a'.charCodeAt(0) + hor)
            document.getElementById(ver_real).innerHTML += (html_new_cell + hor_real + ver_real + html_end_cell);
            let id = ver_real + hor_real;

            if (rawFilename !== undefined) {
                console.log('loading texture to: ' + hor_real + ver_real)
                document.getElementById(hor_real + ver_real).innerHTML += (html_piece_new_img + filename + html_piece_end_img)

            }
            console.log(id);
        }
    }
}

/* IMPLEMENTATION WILL BE SUSPENDED FOR THE TIME BEING
function reDownloadBoard() {
    let requestForBoard = new XMLHttpRequest();
}
*/

// source: https://stackoverflow.com/questions/1769584/get-position-of-element-by-javascript
function getPositionById(id){
    let domObject = document.getElementById(id);

    let x = 0, y = 0
    while (domObject !== null){
        x += domObject.offsetLeft;
        y += domObject.offsetTop;

        domObject = domObject.offsetParent;
    }

    return [x, y];
}

/* IMPLEMENTATION WILL BE SUSPENDED FOR THE TIME BEING
let anonymousLoginRequest = new XMLHttpRequest();
function getTemporaryId() {
    anonymousLoginRequest.open("GET", "/getAnonId/", true);
    anonymousLoginRequest.send();
}
*/

let joinGameRequest = new XMLHttpRequest();

joinGameRequest.onreadystatechange = function () {

};

function joinGame() {

}

let createGameRequest = new XMLHttpRequest();

createGameRequest.onreadystatechange = function () {

};

function createGame() {
    postsRequest.open("GET", "/createBoard", true);
    postsRequest.send();
}

function drawLoginInfo() {
    let loginInfoNotLoggedInPage = ''
    let loginInfoLoggedInPage = ''

}

/* example XML req and res, will reference this a lot but it's only temporarily here

API LIST:
 - GET /
 - POST /login (handled by html form)
 - POST /register (handled by html form)
 - POST /createGame
 - POST /joinGame
 - POST /getMove
 - POST /makeMove

CLIENT - new request
let postsRequest = new XMLHttpRequest();

CLIENT - send a request
postsRequest.open("GET", "/getPost", true);
postsRequest.send();


CLIENT - reaction to a response
postsRequest.onreadystatechange = function () {
    if (this.readyState == 4 && this.status == 200) {

        let rawData = JSON.parse(postsRequest.responseText);
        let wholePage;

        console.log('starting parsing posts');

        rawData[i]["topic"]
        rawData[i]["handle"]

        console.log('finished parsing posts');

        document.getElementById("postings").innerHTML = wholePage;
    }
};

MAKE DRAGGABLE ELEMENT - will not use this, after all
modify this code to suit the chessboard's needs, implement snapping to fields
SOURCE: https://www.w3schools.com/howto/howto_js_draggable.asp

QUICK EXPLANATION:
 - get element by [id], overwrite it's
    * 'onmousedown' function-name with our 'start-dragging' function
 - get root document, for the time of dragging, overwrite root's
    * 'onmousemove' function-name with our 'drag' function
    * 'onmouseup' function-name with our 'stop-dragging' function

makeDraggable(document.getElementById("mydiv"));

function makeDraggable(element) {
  var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  if (document.getElementById(element.id + "header")) {
    // if present, the header is where you move the DIV from:
    document.getElementById(element.id + "header").onmousedown = dragMouseDown;
  } else {
    // otherwise, move the DIV from anywhere inside the DIV:
    element.onmousedown = dragMouseDown;
  }
}

function dragMouseDown(e) {
    e = e || window.event;
    e.preventDefault();
    // get the mouse cursor position at startup:
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    // call a function whenever the cursor moves:
    document.onmousemove = elementDrag;
}

function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    // calculate the new cursor position:
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    // set the element's new position:
    element.style.top = (element.offsetTop - pos2) + "px";
    element.style.left = (element.offsetLeft - pos1) + "px";
}

function closeDragElement() {
    // stop moving when mouse button is released:
    document.onmouseup = null;
    document.onmousemove = null;
}


*/