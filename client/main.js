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

let isSendReady = false  // if it's not a pre-move, can we send it or is it not our turn

let initTarget = undefined,
    endTarget = undefined

let isClicked = false

let checkMySecurityHashRequest = new XMLHttpRequest();

// right after loading, before doing anything, check if the user is logged in
// for now, the only cookie can be the userId, so we can use this simplified function
let cookie = document.cookie
if (cookie.length > 2) {
    localUserId = cookie.split('=')[1]
}

let getMyUsernameRequest = new XMLHttpRequest();

// fixme: this function gets multiple responses, but shouldn't
getMyUsernameRequest.onreadystatechange = function () {
    console.log("received user's username")
    if (this.readyState === 4 && this.status === 200) {
        localUsername = JSON.parse(this.responseText)['username']
        console.log(JSON.parse(this.responseText)['username'])

        drawLoginInfo()
    }
}

if (localUserId !== undefined) {
    console.log('sent user request')
    getMyUsernameRequest.open("GET", '/sayMyName/' + localUserId)
    getMyUsernameRequest.send()
}

let getMoveRequest = new XMLHttpRequest();

getMoveRequest.onreadystatechange = function () {
    if (this.status === 200 && this.readyState === 4) {
        let rawData = JSON.parse(this.responseText)
        // receives {moveFrom, moveTo}

        // todo: check if parseInt is required, if so, apply a fix across the whole project
        let f_x = rawData["moveFrom"].x, 
            f_y = rawData["moveFrom"].y,
            t_x = rawData["moveTo"].x, 
            t_y = rawData["moveTo"].y

        localPlayingField[t_y][t_x] = localPlayingField[f_y][f_x]
        localPlayingField[f_y][f_x] = pe.BLANK

        drawBoard()

        isSendReady = true
    }
}

let makeMoveRequest = new XMLHttpRequest();

makeMoveRequest.onreadystatechange = function () {
    if (this.readyState === 4 && this.status === 200) {
        // we already know everything's fine, and getMove has already been sent
        console.log('move successfully submitted')
    }
}

let markedSquare = undefined
// get clicked field, and highlight it
function moveStart(e) {
    initTarget = e.target

    let f_x = parseInt(initTarget.dataset.x),
        f_y = parseInt(initTarget.dataset.y)

    if (getColor(localPlayingField[f_y][f_x]) === localPieceColor) {
        console.log('piece picked up, ready to place')
        isClicked = true

        e.target.style.background = 'tomato'
        markedSquare = e.target

        castRay(initTarget)
    }
}

function reverseBoard() {

    if (localPieceColor === pe.WHITE)
        localPieceColor = pe.BLACK
    else
        localPieceColor = pe.WHITE

    // rotate the board while keeping the pieces in place
    document.getElementById('perimeter-game-board').style.transition = "transform 0.5s ease-in-out"
    document.getElementById('perimeter-game-board').style.transform = "rotate(180deg)"
    document.querySelectorAll('.piece-img').forEach((el) => {
        el.style.transition = "transform 0.5s ease-in-out"
        el.style.transform = "rotate(-180deg)"
    })


    // redraw and unrotate
    setTimeout(function(){
        drawBoard()
        document.getElementById('perimeter-game-board').style.transition = "transform 0s"
        document.getElementById('perimeter-game-board').style.transform = "rotate(0deg)"
        document.querySelectorAll('.piece-img').forEach((el) => {
            el.style.transition = "transform 0s"
            el.style.transform = "rotate(0deg)"
        })
    }, 500)

}

function finalizeMove() {
    console.log('try finalizeMove()')

    // try applying any special positions since they have a higher priority
    let isSpecial = checkSpecialCondition(true)
    if (isSpecial !== -1) {
        console.log('finalized move with special condition')
        return
    }

    console.log('finalize move: ')

    let f_x = parseInt(initTarget.dataset.x),
        f_y = parseInt(initTarget.dataset.y)

    let t_x = parseInt(endTarget.dataset.x),
        t_y = parseInt(endTarget.dataset.y)

    // if there's no opponent, move freely
    if (localBoardId === undefined) {
        console.log('moved locally')

        localPlayingField[t_y][t_x] = localPlayingField[f_y][f_x]
        localPlayingField[f_y][f_x] = pe.BLANK

        reverseBoard()

        return
    }

    // only do anything if it's your turn
    if (isSendReady) {
        console.log('moved on-line')

        isSendReady = false

        // POST /makeMove {userId, moveFrom, moveTo} (moveFrom/moveTo = {x, y})
        let data = {
            userId: localUserId,
            moveFrom: {x: f_x, y: f_y},
            moveTo: {x: t_x, y: t_y}
        }

        console.log('sending MAKE MOVE')
        console.log(data)

        makeMoveRequest.open("POST", "/makeMove", true)
        makeMoveRequest.setRequestHeader("Content-Type", "application/json")
        makeMoveRequest.send(JSON.stringify(data))

        // this request is sent now but will be returned only after the opponent makes a move
        data = {
            userId: localUserId
        }

        console.log('sending GET MOVE')
        console.log(data)

        getMoveRequest.open("POST", "/getMove", true)
        getMoveRequest.setRequestHeader("Content-Type", "application/json")
        getMoveRequest.send(JSON.stringify(data))


        localPlayingField[t_y][t_x] = localPlayingField[f_y][f_x]
        localPlayingField[f_y][f_x] = pe.BLANK

        drawBoard()
        return
    }

    console.log('move finalization failed')
}

function moveEnd(e) {
    endTarget = e.target

    if (endTarget === null || endTarget === undefined)
        return


    // CLICK ON SELF - cancel the click
    if (initTarget === endTarget) {
        initTarget = undefined
        endTarget = undefined
        isClicked = false

        return
    }

    let f_x = parseInt(initTarget.dataset.x),
        f_y = parseInt(initTarget.dataset.y)

    let t_x = parseInt(endTarget.dataset.x),
        t_y = parseInt(endTarget.dataset.y)

    // CLICK ON OWN COLOR - switch the starting point
    if (getColor(localPlayingField[t_y][t_x]) === localPieceColor) {
        initTarget = e.target
        endTarget = undefined

        isClicked = true

        e.target.style.background = 'tomato'
        markedSquare = e.target

        castRay(initTarget)
        return
    }

    let checkStatus = checkMove(f_x, f_y, t_x, t_y)

    console.log('checkMove return code: ' + checkStatus)

    // UNRESOLVED = fine, apply the changes
    if (checkStatus === boardState.UNRESOLVED) {

        finalizeMove()
    }

    isClicked = false
}

// only checks for bounds, then passes all data along accordingly to the current state of 'isClicked'
function boardClickListener(e) {
    console.log('clicked on board')
    console.log(e.target)

    if (markedSquare !== undefined)
        markedSquare.style.background = ''

    rayCastBlobbedSquares.forEach((el) => {
        el.style.borderRadius = '0'
    })

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

            // directly associated with localPlayingField
            if (localPieceColor === pe.WHITE) {
                newlyAddedCell.dataset.x = String(h_it)
                newlyAddedCell.dataset.y = String(7 - v_it)
            }

            // directly associated with localPlayingField
            if (localPieceColor === pe.BLACK) {
                newlyAddedCell.dataset.x = String(7 - h_it)
                newlyAddedCell.dataset.y = String(v_it)
            }

            let rawFilename = filename
            filename = 'resources/' + filename + '.png'

            let html_piece_new_img = '<img draggable="false" (dragstart)="false;" class="piece-img" src="'
            let html_piece_end_img = '">'

            if (rawFilename !== undefined) {
                document.getElementById(hor_visual + ver_visual).innerHTML += (html_piece_new_img + filename + html_piece_end_img)

            }
        }
    }

    const fields = document.querySelectorAll('.chess-box');

    // At last, add a click event listener to each field
    fields.forEach(field => {
        field.addEventListener('mousedown', boardClickListener)
    })

}

function getOpenMatches() {

    if (localBoardId !== undefined) {
        document.getElementById('match-list').innerHTML = ""
        return
    }


    // Send a GET request to the server
    fetch('/games')
        .then(response => response.json())
        .then(matches => {

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

                joinButton.dataset.boardId = match.boardId

                joinButton.addEventListener('click', joinGame)

                listItem.appendChild(joinButton)
                listItem.appendChild(playerId)
                listItem.appendChild(playerRating)
                listItem.appendChild(boardId)

                matchList.appendChild(listItem)
            })
        })
}

// Check for matches every 1.5 seconds
setInterval(getOpenMatches, 1500)

let assertReadyRequest = new XMLHttpRequest();

assertReadyRequest.onreadystatechange = function () {

    console.log('readiness response: ')
    if (this.status === 200 && this.readyState === 4) {
        let rawData = JSON.parse(this.responseText)

        console.log('declared readiness successfully')

        if (rawData["color"] === undefined){
            console.log('no color available in the response')
            return
        }
        
        localPieceColor = rawData["color"]
        localPlayingField = structuredClone(blankBoardPrefab)

        console.log(rawData)
        drawBoard()

        // to move
        if (localPieceColor === pe.WHITE) {
            isSendReady = true
        }

        // to listen
        if (localPieceColor === pe.BLACK) {
            let data = {
                userId: localUserId,
            }

            console.log(data)

            getMoveRequest.open("POST", "/getMove", true)
            getMoveRequest.setRequestHeader("Content-Type","application/json")
            getMoveRequest.send(JSON.stringify(data))
        }
    }
};

function assertReady() {
    console.log('declaring readiness')

    let data = {
        userId: localUserId
    }

    console.log(data)

    assertReadyRequest.open("POST", "/declareReady", true)
    assertReadyRequest.setRequestHeader("Content-Type", "application/json")
    assertReadyRequest.send(JSON.stringify(data))
}

let joinGameRequest = new XMLHttpRequest();

// a hacky way to avoid responding to the same request twice or even thrice
joinGameRequest.onreadystatechange = function () {
    if (this.status === 200 && this.readyState === 4) {
        let rawData = JSON.parse(this.responseText);

        console.log('joined successfully, setting boardId, sending assertReady, redrawing login info')
        localBoardId = rawData["boardId"]

        assertReady()
        drawLoginInfo()
    }
};

// POST /joinGame {userId, boardId}
function joinGame(e) {

    console.log('try joining game')

    if (e.target === null || e.target === undefined)
        return

    let data = {
        userId: localUserId,
        boardId: e.target.dataset.boardId
    }

    console.log('joining request sent: ')
    console.log(data)

    joinGameRequest.open("POST", "/joinGame", true)
    joinGameRequest.setRequestHeader("Content-Type","application/json")
    joinGameRequest.send(JSON.stringify(data))
}

let createGameRequest = new XMLHttpRequest();

createGameRequest.onreadystatechange = function () {
    if (this.status === 200 && this.readyState === 4) {
        let rawData = JSON.parse(this.responseText);

        localBoardId = rawData["boardId"]

        console.log('created game successfully, declaring readiness, redrawing login info')

        assertReady()
        drawLoginInfo()
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

    let opponentUsername = 'unknown'// todo: implement this

    let boardDataText =
        'Current match:<br>' + localBoardId + '<br>Current opponent:<br>' + opponentUsername + '<br>'

    if (localBoardId === undefined)
        boardDataText = ""

    let loginInfoLoggedInPage =
        '<div id="user-details" class="flex-item">Username: <br>' + localUsername + '<br>' + boardDataText + '</div>' +
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
