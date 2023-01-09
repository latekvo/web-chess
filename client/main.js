// TODO: CREDIT https://www.onlinelabels.com/clip-art/Chess_symbols_set-100629 Igor Krizanovskij for chess clip art

let clickType = {
    START: 0,
    END: 1,
    CANCEL: 2
}

let localPlayingField = []
let localMoveList = []
let localPieceColor = pe.WHITE
let localBoardId = undefined
let localOpponentUsername = undefined

let localUserId = undefined
let localUsername = undefined

let initTarget, endTarget
let isClicked = false

let checkMySecurityHashRequest = new XMLHttpRequest();


// right after loading, before doing anything, check if the user is logged in
// for now, the only cookie can be the userId, so we can use this simplified function
let cookie = document.cookie
if (cookie.length > 2) {
    localUserId = cookie.split('=')[1]
}

let getMyUsernameRequest = new XMLHttpRequest();

getMyUsernameRequest.onreadystatechange = function () {
    console.log("received user's username")
    if (this.readyState === 4) {
        if (this.status === 200) {
            localUsername = JSON.parse(getMyUsernameRequest.responseText)['username']
            console.log(JSON.parse(getMyUsernameRequest.responseText)['username'])

            drawLoginInfo()
        }
    }
}

if (localUserId !== undefined) {
    console.log('sent user request')
    getMyUsernameRequest.open("GET", '/sayMyName/' + localUserId)
    getMyUsernameRequest.send()
}

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
// this is absolutely ((not smart)), we can just check the id of the clicked element
/* sample code:
// wrapper is a div containing all the desired buttons or chessfields
const wrapper = document.getElementById('wrapper');

wrapper.addEventListener('click', (event) => {
  // don't check for this in the chessField checks of course
  const isButton = event.target.nodeName === 'BUTTON';
  if (!isButton) {
    return;
  }

  console.dir(event.target.id);
})
 */
function moveEnd(e) {

}

// only checks for bounds, then passes all data along accordingly to the current state of 'isClicked'
function boardClickListener(e) {
    if (isClicked)
        moveEnd(e)
    else
        moveStart(e)
}

// clicking anywhere on the doc will (should) check for mouse pos
function drawBoard() {

    // for some reason the '/div' gets added automatically, I cannot control it.
    let html_new_row = '<div class="chess-row flex-container" id="',
        html_end_row = '">',
        html_new_cell = '<div class="chess-box" data-x="0" data-y="0" id="',
        html_end_cell = '">'

    document.getElementById('game-board').innerHTML = ""

    for (let v_it = 0; v_it < 8; v_it++) {

        let ver = v_it

        if (localPieceColor === pe.WHITE)
            ver = 7 - v_it

        // real - in the array
        // visual - on the html board

        let ver_visual = String(ver + 1)
        document.getElementById('game-board').innerHTML += (html_new_row + ver_visual + html_end_row)

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

            let html_row = document.getElementById(ver_visual)

            let id = hor_visual + ver_visual
            html_row.innerHTML += html_new_cell + id + html_end_cell

            let newlyAddedCell = document.getElementById(id)

            newlyAddedCell.dataset.x = String(h_it)
            newlyAddedCell.dataset.y = String(v_it)

            let rawFilename = filename
            filename = 'resources/' + filename + '.png'

            let html_piece_new_img = '<img draggable="false" (dragstart)="false;" class="piece-img" src="'
            let html_piece_end_img = '">'

            if (rawFilename !== undefined) {
                document.getElementById(hor_visual + ver_visual).innerHTML += (html_piece_new_img + filename + html_piece_end_img)

            }
        }
    }

    const fields = document.querySelectorAll('.chessboard');

    // At last, add a click event listener to each field
    fields.forEach(field => {
        field.addEventListener('click', boardClickListener)
    })

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

function getOpenMatches() {
    console.log('getting new matches')

    // Send a GET request to the server
    fetch('/games')
        .then(response => response.json())
        .then(matches => {

            console.log(matches)

            let matchList = document.getElementById('match-list')
            matchList.innerHTML = ""

            // matches is an array, [{boardId, playerId, playerRating}, ..., ...]
            matches.forEach((match) => {

                // omit our own matches
                if (match.boardId === localBoardId) {
                    return
                }

                console.log(match)

                // get all the params and fill the open games with them
                const listItem = document.createElement('li')
                listItem.classList.add('match')

                const boardId = document.createElement('div')
                boardId.classList.add('match-board-id')
                boardId.textContent = 'Board ID: ' + match.boardId

                const playerId = document.createElement('div')
                playerId.classList.add('match-player-id')
                playerId.textContent = 'Player ID: ' + match.username

                const playerRating = document.createElement('div')
                playerRating.classList.add('match-player-rating')
                playerRating.textContent = 'Player Rating: ' + match.rank

                const joinButton = document.createElement('button')
                joinButton.classList.add('menu-button')
                joinButton.textContent = 'JOIN'

                joinButton.addEventListener('click', joinGame)

                listItem.appendChild(joinButton)
                listItem.appendChild(boardId)
                listItem.appendChild(playerId)
                listItem.appendChild(playerRating)

                matchList.appendChild(listItem)
            })
        })
}

// Check for matches every 4 seconds
setInterval(getOpenMatches, 4000)

let assertReadyRequest = new XMLHttpRequest();

assertReadyRequest.onreadystatechange = function () {
    if (this.status === 200 && this.readyState === 4) {
        let rawData = JSON.parse(assertReadyRequest.responseText);

        localBoardId = rawData["boardId"]
    }
};


function assertReady() {
    let data = {
        userId: localUserId
    }

    console.log(data)

    createGameRequest.open("POST", "/declareReady", true)
    createGameRequest.setRequestHeader("Content-Type","application/json")
    createGameRequest.send(JSON.stringify(data))
}

let joinGameRequest = new XMLHttpRequest();

joinGameRequest.onreadystatechange = function () {
    if (this.status === 200 && this.readyState === 4) {
        let rawData = JSON.parse(createGameRequest.responseText);

        localBoardId = rawData["boardId"]

        assertReady()
    }
};

// POST /joinGame {userId, boardId}
function joinGame() {
    let data = {
        userId: localUserId,
        boardId: localBoardId
    }

    console.log(data)

    createGameRequest.open("POST", "/joinGame", true)
    createGameRequest.setRequestHeader("Content-Type","application/json")
    createGameRequest.send(JSON.stringify(data))
}

let createGameRequest = new XMLHttpRequest();

createGameRequest.onreadystatechange = function () {
    if (this.status === 200 && this.readyState === 4) {
        let rawData = JSON.parse(createGameRequest.responseText);

        localBoardId = rawData["boardId"]

        assertReady()
    }
};

// POST /createGame {userId}
function createGame() {
    let data = {
        userId: localUserId
    }

    createGameRequest.open("POST", "/createGame", true)
    createGameRequest.setRequestHeader("Content-Type","application/json")
    createGameRequest.send(JSON.stringify(data))
}

document.getElementById('new-game-btn').addEventListener('click', createGame)

function logout() {
    // clear cookies, reload page, sadly just setting cookies to "" doesn't work
    let cookies = document.cookie.split(';')
    let expiryString = "=;expires=" + new Date(0).toUTCString()

    localUserId = undefined

    // this suddenly stopped working
    cookies.forEach((cookie) => {
        document.cookie = cookie + expiryString
    })

    console.log(document.cookie)

    drawLoginInfo()
}

function drawLoginInfo() {
    let loginInfoNotLoggedInPage =
        '<a href="register.html" class="flex-container">' +
        '    <button id="go-register" class="flex-item menu-button">REGISTER</button>' +
        '</a>' +
        '<a href="login.html" class="flex-container">' +
        '    <button id="go-login" class="flex-item menu-button">LOGIN</button>' +
        '</a>'

    let boardDataText =
        'Current match: ${localBoardId}<br>Current opponent:  ${localOpponentUsername}<br>'

    if (localBoardId === undefined)
        boardDataText = ""

    let loginInfoLoggedInPage =
        '<div id="user-details" class="flex-item">Username: ' + localUsername + '<br>' + boardDataText + '</div>' +
        '<button id="go-logout" class="flex-item menu-button">LOGOUT</button>'

    if (localUserId === undefined) {
        document.getElementById('user-data').innerHTML = loginInfoNotLoggedInPage
    } else {
        // todo: fill in the blanks
        document.getElementById('user-data').innerHTML = loginInfoLoggedInPage

        document.getElementById('go-logout').addEventListener('click', logout)
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