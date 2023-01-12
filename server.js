// node.js chess web server
// partially recycled from my 'viva-forums' project

// unfortunately, I had miscalled a lot of aspects and mechanics of chess, this could make the code unreadable,
// but for the project to remain coherent, 'check' will keep on being called a 'mate', and a 'mate' either 'gameOver', or 'checkMate'

//let http = require('http'); // potentially unused
//let events = require("events"); // potentially unused
let fs = require('fs');

let bodyParser = require('body-parser');
let cookieParser = require('cookie-parser');
let bcrypt = require('bcrypt');
let crypto = require("crypto");

/* BCRYPT QUICK REFERENCE

// To hash a password:
bcrypt.genSalt(10, function(err, salt) {
    bcrypt.hash("B4c0/\/", salt, function(err, hash) {
        // Store hash in your password DB.
    });
});

// todo: if password checking in the login section won't work, use this instead
// To check your password,
bcrypt.compare("B4c0/\/", hash, function(err, res) {
    // res === true
});

 */

// we'll try express atop of what's already here, it may be useful
let express = require('express');
let app = express();

// standard mutex lock
// basic syntax: lock.[read|write]Lock('lock's key', function (freeLock) { /// freeLock(); } )
let ReadWriteLock = require('rwlock');
let lock = new ReadWriteLock();

let favicon = require('serve-favicon');

app.use(express.static(__dirname + '/client/'))
app.use(bodyParser.urlencoded({extended : true}))
app.use(bodyParser.json())
app.use(cookieParser())
app.use(favicon(__dirname + '/client/resources/favicon.ico'));

const usernameToEmail = new Map(); // user's username may change
const board_db = new Map(); // stores current board state bound to match's id
const open_matches_db = new Set(); // set of awaiting matches
let user_db = new Map(); // stores stats bound to email, so that a user can be quickly looked up
const active_users = new Map() // stores session data about users

let boardState = {
    NOT_STARTED: -2,

    INVALID: -1, // some of those cases are overlapping, if they are it's an 'illegal move' anyway for the mover, even if it had been a win

    UNRESOLVED: 0, // still ongoing

    WHITE_WIN: 1, // 'win' is only achieved when check-mating the opponent
    BLACK_WIN: 2,

    WHITE_CHECKD: 3, // to clarify, WHITE_CHECKD = white king is attacked
    BLACK_CHECKD: 4,

    WHITE_RESIGNED: 5,
    BLACK_RESIGNED: 6,

    WHITE_ABANDONED: 7,
    BLACK_ABANDONED: 8

}

const errorCode = {

    INVALID_LOGIN: 0,
    INVALID_PASSWORD: 1,

    SESSION_TIMED_OUT: 2,

    BAD_REQUEST: 3,

    MATCH_ENDED: 4,

}

let blankActiveUserPrefab = {
    email: undefined, // player_db main key

    currentBoardId: undefined,
    dateOfCreation: undefined, // logins older than X may be timed out
    awaitedRequest: undefined, // lingering GET 'getMove' request, cached here, erased when completed
}

let blankPlayerPrefab = {
    // email is the key, but will be stored here anyway to make it easier to access it

    email: undefined,
    username: undefined,
    passwordHash: undefined,
    passwordSalt: undefined,

    rank: 1500
}

const pieceEnum = {
    BLANK: -1,

    WHITE: -2,
    BLACK: -3,

    W_K: 0,
    W_Q: 1,
    W_R: 2,
    W_B: 3,
    W_N: 4,
    W_P: 5,
    B_K: 6,
    B_Q: 7,
    B_R: 8,
    B_B: 9,
    B_N: 10,
    B_P: 11
}

let pe = pieceEnum

// this will be far simpler for using checkForMate() as compared to a list-of-pieces approach
const blankBoardPrefab = {
    // board ID is the key, it's not stored here

    boardId: undefined, // master key double-stored for the sake of convienience

    // foreign keys of both players
    whiteEmail: undefined,
    blackEmail: undefined,

    // these will be invalid as soon as the match ends
    whiteId: undefined,
    blackId: undefined,

    toMove: pe.WHITE,
    moveList: [], // [ { time: x, from: [], to: [] }, { time: x, from: [], to: [] } ]

    timeStarted: Date,
    gameState: undefined, // boardState enum defining current state, with UNRESOLVED being still active

    board: [
        [pe.W_R, pe.W_N, pe.W_B, pe.W_Q, pe.W_K, pe.W_B, pe.W_N, pe.W_R], // 1 (0)
        [pe.W_P],
        [pe.BLANK],
        [pe.BLANK],
        [pe.BLANK],
        [pe.BLANK],
        [pe.B_P],
        [pe.B_R, pe.B_N, pe.B_B, pe.B_Q, pe.B_K, pe.B_B, pe.B_N, pe.B_R] // 8 (7)
    ]
}

// fill in the rows 1 through 7
for (let y = 1; y < 7; y++) {
    for (let x = 1; x < 8; x++) {
        blankBoardPrefab.board[y].push(blankBoardPrefab.board[y][0])
    }
}

// these lists only check for possible attacks, since pawns differ in this matter
let atk_vel_list = [
    { pieces: [pe.W_Q, pe.B_Q], velocities: [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]] },
    { pieces: [pe.W_R, pe.B_R], velocities: [[-1, 0], [1, 0], [0, -1], [0, 1]] },
    { pieces: [pe.W_B, pe.B_B], velocities: [[-1, -1], [1, -1], [-1, 1], [1, 1]] }
]
// remember: black pieces are at the bottom, white at the top, this can ONLY be visually be reversed, and ONLY at the client side
let atk_pos_list = [
    { pieces: [pe.W_K, pe.B_K], positions: [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]] },
    { pieces: [pe.W_N, pe.B_N], positions: [[-1, 2], [1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1]] },
    { pieces: [pe.W_P], positions: [[-1, 1], [1, 1]] },
    { pieces: [pe.B_P], positions: [[-1, -1], [1, -1]] }
]
// also add a case for pawn moving forwards, and special case for pawn moving from row 2 to 4 or 7 to 5

let mov_vel_list = atk_vel_list; // duplicate for ease of use and ease of readability
let mov_pos_list = atk_pos_list; // modified pawn behaviour compared to atk_pos_list

// replace movement options for pawns, from diagonal to vertical
mov_pos_list[2].positions = [[0, 1]]
mov_pos_list[3].positions = [[0, -1]]

/**
 * Returns the color of a piece based on it's ID
 * @param {Number} piece_id - Piece ID derived from the pieceEnum
 */
function getColor(piece_id) {
    if (piece_id < 0)
        return pe.BLANK

    if (piece_id < pe.B_K)
        return pe.WHITE

    return pe.BLACK
}

/**
 * Returns piece iterator in the mov_vel_list or mov_pos_list
 * @param {Number} pieceId - id of the piece
 * @returns {{pieceIt: number, isPosBased: boolean}} pieceIt, isPosBased - iterator of the piece, piece's belonging to either vel or pos list
 **/
function getPieceIt(pieceId) {
    let pieceIt = -1
    let isPosBased = false

    for (let i = 0; i < mov_vel_list.length; i++) {
        if (mov_vel_list[i].pieces.includes(pieceId))
            pieceIt = i
    }
    for (let i = 0; i < mov_pos_list.length; i++) {
        if (mov_pos_list[i].pieces.includes(pieceId)) {
            pieceIt = i
            isPosBased = true
        }
    }

    return {pieceIt: pieceIt, isPosBased: isPosBased}
}


/**
 * based on a raw board array, returns 'true' if there is a mate present
 * @param {String} boardId - board's id
 *
 * @param f_x - move's x origin
 * @param f_y - move's y origin
 * @param t_x - move's x target
 * @param t_y - move's y target
 *
 * @returns {boardState} - UNRESOLVED if nothing got detected, otherwise describes the situation present
 */
function checkMove(boardId, {f_x, f_y}, {t_x, t_y}) {
    let board = board_db.get(boardId).board

    let pieceId = board[f_y][f_x]
    let pieceCol = getColor(pieceId)

    // CHECK FOR POSSIBILITY OF A MOVE
    // ray-cast - check for obstacles
    // pos-check - check for friendlies at the destination

    // find piece's iterator in the mov_vel_list or mov_pos_list
    let {pieceIt, isPosBased} = getPieceIt(pieceId)

    // error, request corrupted, the square is blank
    if (pieceIt === -1) {
        console.log('ERROR: player tried moving a blank space')
        return boardState.INVALID
    }

    let isMovePossible = false

    // ray-cast
    if (!isPosBased) {

        let vel_x = 0,
            vel_y = 0

        // x - find the correct vector
        if (f_x > t_x) vel_x = -1
        if (f_x < t_x) vel_x = 1

        if (f_y > t_y) vel_y = -1
        if (f_y < t_y) vel_y = 1


        let ray = {x: f_x, y: f_y}

        // iterate the ray
        ray.x += vel_x
        ray.y += vel_y

        // cast the ray
        while (ray.x >= 0 && ray.x < 8 && ray.y >= 0 && ray.y < 8) {

            // reached the destination
            if (ray.x === t_x && ray.y === t_y) {
                isMovePossible = true
                break
            }

            // check for: line of sight
            if (board[ray.y][ray.x] !== pe.BLANK) {
                break
            }

            // iterate the ray
            ray.x += vel_x
            ray.y += vel_y
        }

    } else /* (isPosBased) */ {
        // vec from f to t
        let mask_x = t_x - f_x,
            mask_y = t_y - f_y

        // and just check if there exists a fitting mask for such a move
        for (let i = 0; i < mov_pos_list[pieceIt].positions.length; i++) {

            if (mask_x === mov_pos_list[pieceIt].positions[i][0] &&
                mask_y === mov_pos_list[pieceIt].positions[i][1]) {

                isMovePossible = true
                break
            }
        }
    }

    // move will be impossible if both pieces are the same color
    if (pieceCol === getColor(board[t_y][t_x])) {
        isMovePossible = false
        console.log('player tried moving pieces into each other')
    }

    // CHECK FOR A MATE
    // * find kings
    // * cast horizontal, vertical and diagonal rays from the king
    // * if there is an attacking element in the way of the ray, announce a check
    // * only way to lose (for simplicity) is to resign, so if the king can't move, he needs to resign.
    // ? why is that? besides checking for king's space, I would need to check if any piece can get in the way of ray
    // ? and that will be complicated.

    let white_king = undefined, black_king = undefined

    // find coords of the kings
    for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
            if (board[y][x] === pe.W_K) {
                white_king = {x: x, y: y}
            }
            if (board[y][x] === pe.B_K) {
                black_king = {x: x, y: y}
            }
        }
    }

    let isWhiteMated = false;
    let isBlackMated = false;

    // RAY-CAST CHECK FOR A MATE
    for (let caseId = 0; caseId < atk_vel_list.length; caseId++) {
        for (let velocityId = 0; velocityId < atk_vel_list[caseId].velocities.length; velocityId++) {
            let wStopRay = false, bStopRay = false

            let vel_x = atk_vel_list[caseId].velocities[velocityId][0],
                vel_y = atk_vel_list[caseId].velocities[velocityId][1]

            // cast a ray
            for (let i = 0, ray_w = white_king, ray_b = black_king; i < 8; i++) {

                // iterate the ray
                ray_w.x += vel_x
                ray_w.y += vel_y
                ray_b.x += vel_x
                ray_b.y += vel_y

                // check for: not being out of bounds
                if (!(0 < ray_w.x && ray_w.x < 7) || !(0 < ray_w.y && ray_w.y < 7))
                    wStopRay = true;

                if (!(0 < ray_b.x && ray_b.x < 7) || !(0 < ray_b.y && ray_b.y < 7))
                    bStopRay = true;

                if (wStopRay && bStopRay)
                    break

                // check for the piece attacking a king
                for (let pieceId = 0; pieceId < atk_vel_list[caseId].pieces.length; pieceId++) {
                    if (wStopRay === false && board[ray_w.y][ray_w.x] === atk_vel_list[caseId].pieces[pieceId] &&
                        getColor(atk_vel_list[caseId].pieces[pieceId]) === pe.BLACK) {
                        isWhiteMated = true;
                        wStopRay = true;
                    }
                    if (bStopRay === false && board[ray_b.y][ray_b.x] === atk_vel_list[caseId].pieces[pieceId] &&
                        getColor(atk_vel_list[caseId].pieces[pieceId]) === pe.WHITE) {
                        isBlackMated = true;
                        bStopRay = true;
                    }
                }

                // check for: line of sight
                if (wStopRay === false && board[ray_w.y][ray_w.x] !== pe.BLANK)
                    wStopRay = true;

                if (bStopRay === false && board[ray_b.y][ray_b.x] !== pe.BLANK)
                    bStopRay = true;

                if (wStopRay && bStopRay)
                    break
            }

        }

    }

    // POSITION CHECK FOR A MATE - this loop needs to be separate, as it looks at points, not rays
    for (let caseId = 0; caseId < atk_pos_list.length; caseId++) {
        for (let positionId = 0; positionId < atk_pos_list[caseId].positions.length; positionId++) {
            let wStopChecking = false
            let bStopChecking = false

            // set the checked point
            let point_w = {
                    x: white_king.x + atk_pos_list[caseId].positions[positionId][0],
                    y: white_king.y + atk_pos_list[caseId].positions[positionId][1]
                },
                point_b = {
                    x: black_king.x + atk_pos_list[caseId].positions[positionId][0],
                    y: black_king.y + atk_pos_list[caseId].positions[positionId][1]
                }
            // check for: not being out of bounds
            if (!(0 < point_w.x && point_w.x < 7) || !(0 < point_w.y && point_w.y < 7))
                wStopChecking = true

            if (!(0 < point_b.x && point_b.x < 7) || !(0 < point_b.y && point_b.y < 7))
                bStopChecking = true

            for (let pieceId = 0; pieceId < atk_pos_list[caseId].pieces.length; pieceId++) {
                if (wStopChecking === false && board[point_w.y][point_w.x] === atk_pos_list[caseId].pieces[pieceId] &&
                    getColor(atk_pos_list[caseId].pieces[pieceId]) === pe.BLACK) {
                    isWhiteMated = true
                }
                if (bStopChecking === false && board[point_b.y][point_b.x] === atk_pos_list[caseId].pieces[pieceId] &&
                    getColor(atk_pos_list[caseId].pieces[pieceId]) === pe.WHITE) {
                    isBlackMated = true
                }
            }
        }
    }

    // to check for lock (game over):
    /* - check every possible king's move
    *  - have an attacking ray, check if anything can move into it
    *  - if there are multiple rays, it's an outright loss
    * */
    let isWhiteLocked = false
    let isBlackLocked = false

    // todo: besides checking for check, see if it's possible to escape this check, or to block it.
    //  only calculated to reassure either isWhiteMated or isBlackMated, either of them has to be true

    console.log('is Mate? ' + isWhiteMated + ' ' + isBlackMated +
        'is Lock? ' + isWhiteLocked + ' ' + isBlackLocked +
        'is Possible? ' + isMovePossible)

    if (!isMovePossible)
        return boardState.INVALID

    let output = boardState.UNRESOLVED

    if (isWhiteMated)
        output = boardState.WHITE_CHECKD

    if (isBlackMated)
        output = boardState.BLACK_CHECKD

    if (isWhiteLocked)
        output = boardState.BLACK_WIN

    if (isBlackLocked)
        output = boardState.WHITE_WIN

    if (isWhiteMated && isBlackMated)
        output = boardState.INVALID

    console.log('gave OK to a move on board:  ' + boardId)
    return output;
}

/**
 * creates a new board and pushes it to the board_db
 * @param whiteUserId - white user's identification hash
 * @param blackUserId - black user's identification hash
 * @returns {string} - hash of the created board
 */
function makeBoard(whiteUserId, blackUserId) {
    let boardId = crypto.randomBytes(32).toString('hex');

    let newBoard = blankBoardPrefab

    newBoard.boardId = boardId
    newBoard.whiteId = whiteUserId
    newBoard.blackId = blackUserId
    newBoard.whiteEmail = active_users.get(whiteUserId) // doesn't matter if these are undefined
    newBoard.blackEmail = active_users.get(blackUserId) // just look 5 lines lower
    newBoard.gameState = boardState.NOT_STARTED

    if (newBoard.whiteEmail !== undefined)
        newBoard.whiteEmail = newBoard.whiteEmail.email

    if (newBoard.blackEmail !== undefined)
        newBoard.blackEmail = newBoard.blackEmail.email
    // NOTE: removed mutex functionality, it may have been necessary, will find out eventually

    board_db.set(boardId, newBoard)

    return boardId;
}

/**
 * updates a desired board's state, first checking if it's even possible
 * @param boardId - board's identifier hash
 * @param f_x - x of the initial position
 * @param f_y - y of the initial position
 * @param t_x - x of the desired position
 * @param t_y - y of the desired position
 * @returns {boardState} - an enum indicating if the move succeeded and if there is a check or a mate present
 */
function makeMove(boardId, {f_x, f_y}, {t_x, t_y}) {
    // NOTE that 'board' is a reference, all modifications to it are just modifications to the element in board_db
    let board = board_db.get(boardId)

    // simply describes what is currently happening on the board
    let state = checkMove(boardId, {f_x, f_y}, {t_x, t_y})

    // if the move causes self to get checked, the move is invalid
    if ( state === boardState.WHITE_CHECKD && board.toMove === pe.WHITE ||
         state === boardState.BLACK_CHECKD && board.toMove === pe.BLACK )
        state = boardState.INVALID

    // if everything's all right
    if (state !== boardState.INVALID) {
        // finalize on the move
        board.board[t_y][t_x] = board.board[f_y][f_x]
        board.board[f_y][f_x] = pe.BLANK

        // record the move
        board.moveList.push({from: [f_x, f_y], to: [t_x, t_y]})

        // and switch the next player "to move"
        if (board.toMove === pe.WHITE) {
            board.toMove = pe.BLACK
        } else {
            board.toMove = pe.WHITE
        }

        // start the game for real if it's not started yet and add a timestamp
        if (board.gameState === boardState.NOT_STARTED) {
            board.gameState = boardState.UNRESOLVED
        }
    }

    return state
}

app.post('/declareReady', (req, res) => {
    console.log('player join confirmation attempt')

    let reqBody = req.body
    let requesterId = reqBody["userId"]
    let requesterSessionData = active_users.get(requesterId)
    let requester = user_db.get(requesterSessionData.email)
    let board = board_db.get(requesterSessionData.currentBoardId)

    let whiteSessionData = active_users.get(board.whiteId)
    let blackSessionData = active_users.get(board.blackId)

    // check if the other player is ready, if so, send back both replies
    // if not, set this response as the player's awaited response
    if ((whiteSessionData !== undefined && whiteSessionData.awaitedRequest !== undefined) ||
        (blackSessionData !== undefined && blackSessionData.awaitedRequest !== undefined)) {

        console.log('ready status: both players ready: ' + requester.username + ' has joined')

        let requesterColor = undefined

        if (whiteSessionData !== undefined) {
            console.log('player ' + whiteSessionData.username + ' is now playing')
            whiteSessionData.awaitedRequest.writeHead(200)
            whiteSessionData.awaitedRequest.write(JSON.stringify({color: pe.WHITE}))
            whiteSessionData.awaitedRequest.send()

            whiteSessionData.awaitedRequest = undefined

            requesterColor = pe.BLACK
        } else {
            console.log('player ' + blackSessionData.username + ' is now playing')
            blackSessionData.awaitedRequest.writeHead(200)
            blackSessionData.awaitedRequest.write(JSON.stringify({color: pe.BLACK}))
            blackSessionData.awaitedRequest.send()

            blackSessionData.awaitedRequest = undefined

            requesterColor = pe.WHITE
        }

        console.log('player ' + requester.username + ' is now playing')

        res.writeHead(200)
        res.write(JSON.stringify({color: requesterColor}))
        res.send()

        requesterSessionData.awaitedRequest = undefined
    } else {
        console.log('ready status: one player ready: ' + requester.username)

        requesterSessionData.awaitedRequest = res

        // only now do we actually determine the color
    }

})

app.post('/createGame', (req, res) => {
    let reqBody = req.body

    let creatorId = reqBody["userId"]

    let userSessionData = active_users.get(creatorId)
    let user = user_db.get(userSessionData.email)

    if (user === undefined) {
        res.writeHead(400)
        res.send()

        console.log('unknown user tried joining')
        return
    }

    let whiteId = undefined, blackId = undefined;

    if (Math.random() < 0.5) {
        whiteId = creatorId
    } else {
        blackId = creatorId
    }

    // Advertise, then use makeMatch
    // write both req and res to the advertisement file, as soon as someone joins, reactivate both req and res and send them an OK as well as the board id
    let boardId = makeBoard(whiteId, blackId)

    console.log('created a new board: ')
    console.log(board_db.get(boardId))

    userSessionData.currentBoardId = boardId

    console.log('opened new ad for: ' + boardId)
    open_matches_db.add(boardId)
    console.log(open_matches_db)

    res.writeHead(200)
    res.write(JSON.stringify({boardId: boardId}))
    res.send()
});

// creator of the game has to call /joinGame as well, it will make him wait for an opponent to show up
app.post('/joinGame', (req, res) => {
    let userId = req.body["userId"]

    let userSessionData = active_users.get(userId)
    let user = user_db.get(userSessionData.email)

    let boardId = req.body["boardId"]
    let board = board_db.get(boardId)

    console.log('player joining: ' + boardId)

    // error detection
    if (user === undefined) {
        res.writeHead(400)
        res.write(JSON.stringify({error: errorCode.SESSION_TIMED_OUT}))
        res.send()

        return
    }
    if (board === undefined) {
        res.writeHead(400)
        res.write(JSON.stringify({error: errorCode.BAD_REQUEST}))
        res.send()

        return
    }

    // this check will be triggered only if both of the players collaborate to deliberately crash/bug the server
    // todo: implement ban system
    if (!open_matches_db.has(boardId)) {
        res.write(JSON.stringify({error: errorCode.BAD_REQUEST}))
        res.writeHead(400)
        res.send()
    }

    open_matches_db.delete(boardId)
    userSessionData.currentBoardId = boardId

    res.writeHead(200)
    res.write(JSON.stringify({boardId: boardId}))
    res.send()
});

// only appends the httpRequest to the appropriate user
app.post('/getMove', (req, res) => {
    let requesterId = req.body["userId"];

    if (active_users.has(requesterId)) {
        // unintuitive, .get() actually returns a reference, not a value
        active_users.get(requesterId).awaitedRequest = res
    } else {
        res.writeHead(400) // timed out
        res.send()
    }
});

app.post('/makeMove', async (req, res) => {
    let rawData = req.body
    let userId = rawData['userId']
    let userSessionData = user_db.get(active_users.get(userId).email)

    // user timed out
    if (userSessionData === undefined) {
        res.writeHead(400)
        res.write({error: errorCode.SESSION_TIMED_OUT})
        res.send()
        return
    }

    let boardId = userSessionData.currentBoardId
    let boardCp = board_db.get(boardId)

    let moveStatus = await makeMove(boardId, rawData['moveFrom'], rawData['moveTo'])
    if (moveStatus !== boardState.INVALID) {
        let opponentId

        // determine color of the opponent
        if (userId === boardCp.whiteId)
            opponentId = boardCp.blackId
        else
            opponentId = boardCp.whiteId

        // send back the cached request
        if (active_users.has(opponentId)) {

            active_users.get(opponentId).awaitedRequest.writeHead(200)
            active_users.get(opponentId).awaitedRequest.write({
                moveFrom: rawData['moveFrom'],
                moveTo: rawData['moveTo']
            })
            active_users.get(opponentId).awaitedRequest.send()

            res.writeHead(200)
        } else {
            res.writeHead(400)
            res.write({error: errorCode.MATCH_ENDED}) // later specify 'abandoned by X'
        }

    } else {
        // move could not be made
        res.writeHead(400)
        res.write({error: errorCode.BAD_REQUEST})
    }

    // 200 or 400
    res.send()
});

app.post('/login', (req, res) => {
    let {usernameOrEmail, password} = req.body

    // username may also be an email

    // log in by email
    let user = user_db.get(usernameOrEmail)
    let email = usernameOrEmail

    // log in by username
    if (user === undefined) {
        email = usernameToEmail.get(usernameOrEmail)
        user = user_db.get(email)
    }

    // invalid username
    if (user === undefined) {
        res.writeHead(400)
        res.write(fs.readFileSync('client/login.html', 'utf8'))
        res.send()
        return
    }

    bcrypt.hash(password, user.passwordSalt, function(err, hash) {
        if (hash === user.passwordHash) {

            // note: if this isn't clear yet, userId IS A random, PRIVATE SESSION TOKEN
            let newUserId = crypto.randomBytes(32).toString('hex')
            
            let newSessionData = blankActiveUserPrefab

            newSessionData.email = email
            newSessionData.dateOfCreation = new Date()

            // login the account
            console.log('new userId created')
            active_users.set(newUserId, newSessionData)

            res.cookie('userId', newUserId)

            res.writeHead(200)
            res.write(fs.readFileSync('client/index.html', 'utf8'))
            res.send()
        } else {
            // invalid password
            res.writeHead(400)
            res.write(fs.readFileSync('client/login.html', 'utf8'))
            res.send()
        }
    })
})

function backupUserDatabase() {
    lock.writeLock('user_db', function (freeLock) {

        console.log(user_db)

        // Map -> Array -> String
        fs.writeFileSync('users_db.json', JSON.stringify(Array.from(user_db.entries())))

        freeLock()
    })
}
app.post('/register', async (req, res) => {
    let {email, username, password /*, passwordRepeat*/} = req.body

    // make sure neither the same email nor username exists yet
    if (usernameToEmail.has(username) || user_db.has(email)) {
        res.writeHead(400)
        res.write(fs.readFileSync('client/register.html', 'utf8'))
        res.send()
        return
    }

    // password repeat should be checked locally, and the 'register' button should just get greyed out

    let newUser = blankPlayerPrefab
    newUser.username = username
    newUser.email = email

    // gen salt, hash the password
    // this function is somehow async, without me being able to use await
    // thus, it finishes work after the changes have been already applied
    // thus everything now has to be inside this function for anything to work
    bcrypt.genSalt(10, function (err, salt) {
        bcrypt.hash(password, salt, function (err, hash) {
            newUser.passwordSalt = salt
            newUser.passwordHash = hash

            // add the account
            user_db.set(email, newUser)
            usernameToEmail.set(username, email)

            // and respond with the landing page
            res.writeHead(200)
            res.write(fs.readFileSync('client/index.html', 'utf8'))
            res.send()

            backupUserDatabase()
        })
    })
})

// too little info for this to be used for now
app.get('/player/:name', function (req, res) {
    let playerName = req.params.name

    let player_email = usernameToEmail.get(playerName)

    if (player_email === undefined) {
        res.writeHead(400)
        res.write({error: errorCode.BAD_REQUEST})
        res.send()
        return
    }

    let player = user_db.get(player_email)

    res.writeHead(200)
    res.write(JSON.stringify({username: player.username, rank: player.rank}))
    res.send()
})

// a request for some open games on the list
app.get('/games', function (req, res) {
    let maxResponseLength = 16 // temporary hardcoded limit to how many games can be advertised at a time

    let recentGames = Array.from(open_matches_db).slice(-maxResponseLength) // FIFO X matches from the open...db

    let outputtedGames = []

    console.log('open games: ')
    console.log(open_matches_db)

    recentGames.forEach((boardId) => {
        let board = board_db.get(boardId)

        if (board === undefined) {
            console.log('board not found, ID: ' + boardId)
            return
        }

        let boardUserEmail

        if (board.whiteEmail !== undefined)
            boardUserEmail = board.whiteEmail
        else
            boardUserEmail = board.blackEmail

        let boardUser = user_db.get(boardUserEmail)

        if (boardUser === undefined) {
            console.log('user not found, mail: ' + boardUserEmail)
            return
        }

        // {boardId: board.boardId, username: player.username, rank: player.rank}
        outputtedGames.push({
            boardId: boardId,
            username: boardUser.username,
            rank: boardUser.rank
        })
    })

    console.log(outputtedGames)

    res.writeHead(200)
    res.write(JSON.stringify(outputtedGames))
    res.send()
})

// how do I send multiple files? when another file is linked to index.html, the request for it is auto sent to the server
// I need to respond to /style.css get request with style.css file. this is done automatically if I use .static() function
app.get('/', function (req, res) {
    res.writeHead(200);
    res.write(fs.readFileSync('client/index.html', 'utf8'));
    res.send();
})

// misc, this doesn't work, todo: look into why is that
app.get('/favicon.ico', function (req, res) {
    res.writeHead(200);
    res.write(fs.readFileSync('client/resources/favicon.ico'));
    res.send();
})

app.get('/sayMyName/:id', function (req, res) {
    let userMail = active_users.get(req.params.id).email

    let user = user_db.get(userMail)

    if (user === undefined) {
        res.writeHead(400)
        res.send()
        return
    }

    console.log('say my name: ' + user.username)

    res.writeHead(200)
    res.write(JSON.stringify({username: user.username}))
    res.send()
})

app.post('/isHashValid/:id', function (req, res) {
    let reqId = req.params.id

    if (active_users.has(reqId)) {

    }
    res.writeHead(200)
    res.write(JSON.stringify({username: username}))
    res.send()
})

// load main db
user_db = new Map(JSON.parse(fs.readFileSync('users_db.json').toString()))
console.log(user_db)

// also populate the translation map
user_db.forEach((entry) => {
    usernameToEmail.set(entry.username, entry.email)
})

let port = 3000

app.listen(port)

console.log("server started on port: " + port)
