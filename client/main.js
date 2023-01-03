// TODO: CREDIT https://www.onlinelabels.com/clip-art/Chess_symbols_set-100629 Igor Krizanovskij for chess clip art

let localPlayingField = []
let localMoveList = []
let localPieceColor = pe.WHITE
let localBoardId = undefined

let localUserId = undefined

let initPos_x, initPos_y
let isClicked = false

function getPositionById(id) {
    let domObject = document.getElementById(id);

    let x = 0, y = 0
    while (domObject !== null){
        x += domObject.offsetLeft;
        y += domObject.offsetTop;

        domObject = domObject.offsetParent;
    }

    return [x, y];
}

// get clicked field, and highlight it
function moveStart(e) {
    initPos_x = e.clientX
    initPos_y = e.clientY

    isClicked = true
}

// get other field, and move the piece there
function moveEnd(e, startPos_x, startPos_y, endPos_x, endPos_y) {
    // based on field size, get both the selected chess fields and move the piece from one to another

    // TODO: iterate differently depending on your color

    let x_pos = undefined, y_pos = undefined // html id
    let x_real = undefined, y_real = undefined // array coords

    for (let x = 0; x < 8; x++) {

        x_pos = x + 1
    }

    for (let y = 0; y < 8; y++) {
        y_pos = String.fromCharCode('a'.charCodeAt(0) + y)
    }

    // just in case
    if (x_pos === undefined || y_pos === undefined) {
        isClicked = false
        return
    }

    // move the img and submit the move


}

// only checks for bounds, then passes all data along accordingly to the current state of 'isClicked'
function boardClickListener(e) {
    // get field's size & mouse pos, compare them
    // cancel move (isClicked = false) if it's the same square
    let mousePos_x = e.clientX,
        mousePos_y = e.clientY

    // get position of the 0,0 chess field, and the 1,1 chess field, to calculate a single field's size

    let fieldPosA, fieldPosB

    if (localPieceColor === pe.WHITE) {
        fieldPosA = getPositionById("a8")
        fieldPosB = getPositionById("b7")
    } else {
        fieldPosA = getPositionById("h1")
        fieldPosB = getPositionById("g2")
    }

    let pos_start_x = fieldPosA[0]
    let pos_start_y = fieldPosA[1]

    let fieldSize = fieldPosB[0] - fieldPosA[0]

    let rbCorner_x = fieldPosA[0] + fieldSize * 8,
        rbCorner_y = fieldPosA[1] + fieldSize * 8

    // note: for y, higher on page = lower number

    // check for out of bounds clicks
    if (mousePos_x < pos_start_x || mousePos_x > rbCorner_x ||
        mousePos_y < pos_start_y || mousePos_y > rbCorner_y) {
        isClicked = false
        return
    }

    console.log('click!')
    console.log(e.clientY)

    if (isClicked)
        moveEnd(e)
    else
        moveStart(e)
}

// clicking anywhere on the doc will (should) check for mouse pos
document.onmousedown = boardClickListener

function drawBoard() {

    // for some reason the '/div' gets added automatically, I cannot control it.
    let html_new_row = '<div class="chess-row flex-container" id="',
        html_end_row = '">',
        html_new_cell = '<div class="chess-box" id="',
        html_end_cell = '">'

    document.getElementById('game-board').innerHTML = ""

    for (let v_it = 0; v_it < 8; v_it++) {

        let ver = v_it

        if (localPieceColor === pe.WHITE)
            ver = 7 - v_it

        // real - in the array
        // visual - on the html board

        let ver_visual = String(ver + 1);
        document.getElementById('game-board').innerHTML += (html_new_row + ver_visual + html_end_row);

        for (let h_it = 0; h_it < 8; h_it++) {

            let hor = h_it

            if (localPieceColor === pe.BLACK)
                hor = 7 - h_it

            let hor_visual = String.fromCharCode('a'.charCodeAt(0) + hor)

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


            document.getElementById(ver_visual).innerHTML += (html_new_cell + hor_visual + ver_visual + html_end_cell);
            let id = ver_visual + hor_visual;

            if (rawFilename !== undefined) {
                console.log('loading texture to: ' + hor_visual + ver_visual)
                document.getElementById(hor_visual + ver_visual).innerHTML += (html_piece_new_img + filename + html_piece_end_img)

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

// POST /joinGame {userId, boardId}
function joinGame() {
    let body = new FormData()
    body.set('userId', localUserId)
    body.set('boardId', localBoardId)

    createGameRequest.open("GET", "/joinGame", true)
    createGameRequest.send(body)
}

let createGameRequest = new XMLHttpRequest();

createGameRequest.onreadystatechange = function () {
    let rawData = JSON.parse(createGameRequest.responseText);

    localBoardId = rawData["boardId"]
};

// POST /createGame {userId}
function createGame() {
    let body = new FormData()
    body.set('userId', localUserId)

    createGameRequest.open("GET", "/createBoard", true)
    createGameRequest.send(body)
}

function drawLoginInfo() {
    let loginInfoNotLoggedInPage =
        '<a href="register.html" class="flex-container">' +
        '    <button id="go-register" class="flex-item menu-button">REGISTER</button>' +
        '</a>' +
        '<a href="login.html" class="flex-container">' +
        '    <button id="go-login" class="flex-item menu-button">LOGIN</button>' +
        '</a>'

    let loginInfoLoggedInPage =
        '<div id="user-details" class="flex-item">Username: [USERNAME]<br>Current match: [BOARD_ID]<br>Current opponent: [OPP_USERNAME]<br></div>' +
        '<button id="go-logout" class="flex-item menu-button">LOGOUT</button>'

    if (localUserId === undefined) {
        document.getElementById('user-data').innerHTML = loginInfoNotLoggedInPage
    } else {
        // todo: fill in the blanks
        document.getElementById('user-data').innerHTML = loginInfoLoggedInPage
    }

}

/* example XML req and res, will reference this a lot but it's only temporarily here

API LIST:
 - GET /
 - POST /login (handled by html form)
 - POST /register (handled by html form)
 - POST /createGame {userId}
 - POST /joinGame {userId, boardId}
 - POST /getMove {userId}
 - POST /makeMove {userId, moveFrom, moveTo} (moveFrom/moveTo = {x, y})

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
  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
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