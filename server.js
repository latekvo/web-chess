// node.js chess web server
// partially recycled from my 'viva-forums' project

// unfortunately, I had miscalled a lot of aspects and mechanics of chess, this could make the code unreadable,
// but for the project to remain coherent, 'check' will keep on being called a 'mate', and a 'mate' either 'gameOver', or 'checkMate'

let http = require('http');
let events = require("events");
let fs = require('fs');

let bodyParser = require('body-parser');
let cookieParser = require('cookie-parser');
var bcrypt = require('bcrypt');
let crypto = require("crypto");

/* BCRYPT QUICK REFERENCE

// To hash a password:
bcrypt.genSalt(10, function(err, salt) {
    bcrypt.hash("B4c0/\/", salt, function(err, hash) {
        // Store hash in your password DB.
    });
});

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

app.use(express.static(__dirname + '/client/'));
app.use(bodyParser.urlencoded({extended : true}));
app.use(cookieParser());

const board_db = new Map([]); // stores current board state bound to match's id
const open_matches_db = []; // array of awaiting matches
const player_db = new Map([]); // stores stats bound to email, so that a user can be quickly looked up
const active_users = new Map([]) // stores session-keys and accounts associated with them

let boardState = {
    UNRESOLVED: 0,

    WHITE_WIN: 0,
    BLACK_WIN: 0,

    WHITE_CHECK: 0,
    BLACK_CHECK: 0,

    // some of those cases are overlapping, if they are it's an 'illegal move' anyway for the mover, even if it would have been a win
}

let blankActiveUserPrefab = {
    email: undefined, // player_db main key

    dateOfCreation: undefined,
    awaitedRequest: undefined, // lingering GET 'getMove' request, cached here, erased when completed
}

let blankPlayerPrefab = {
    // email is the key, it's not stored here

    username: undefined,
    password: undefined, // a hash of the password

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

    // foreign keys of both players
    whiteId: undefined,
    blackId: undefined,

    toMove: pe.WHITE,
    moveList: [], // [ [from, to], [from, to] ]

    board: [
        [pe.W_R, pe.W_N, pe.W_B, pe.W_K, pe.W_Q, pe.W_B, pe.W_N, pe.W_R], // 1 (0)
        [pe.W_P],
        [pe.BLANK],
        [pe.BLANK],
        [pe.BLANK],
        [pe.BLANK],
        [pe.B_P],
        [pe.B_R, pe.B_N, pe.B_B, pe.B_K, pe.B_Q, pe.B_B, pe.B_N, pe.B_R] // 8 (7)
    ]
}

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
 * based on a raw board array, returns 'true' if there is a mate present
 * @param {Array} board - board's array
 * @returns {boolean} - 'true' if there is a mate present
*/
function checkForMate(board) {
    // * find kings
    // * cast horizontal, vertical and diagonal rays from the king
    // * if there is an attacking element in the way of the ray, announce a check
    // * only way to lose (for simplicity) is to resign, so if the king can't move, he needs to resign.
    // ? why is that? besides checking for king's space, I would need to check if any piece can get in the way of ray
    // ? and that will be complicated. This is on a far off TODO list
    let white_king, black_king

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

    let isMate = false;
    for (let caseId = 0; caseId < atk_vel_list.length; caseId++) {
        let wStopChecking = false, bStopChecking = false;

        for (let velocityId = 0; velocityId < atk_vel_list[caseId].positions.length; velocityId++) {
            // cast a ray
            for (let i = 0, r_w = white_king, r_b = black_king; i < 8; i++) {

                r_w += atk_vel_list[caseId].positions[velocityId];
                r_b += atk_vel_list[caseId].positions[velocityId];

                // check for: not being out of bounds
                if (!(0 < r_w.x && r_w.x < 7) || !(0 < r_w.y && r_w.y < 7))
                    wStopChecking = true;

                // check for: not being out of bounds
                if (!(0 < r_b.x && r_b.x < 7) || !(0 < r_b.y && r_b.y < 7))
                    bStopChecking = true;

                for (let pieceId = 0; pieceId < atk_vel_list[caseId].pieces.length; pieceId++) {
                    if (wStopChecking === false && board[r_w.y][r_w.x] === atk_vel_list[caseId].pieces[pieceId]) {
                        isMate = true;
                        wStopChecking = true;
                    }
                    if (bStopChecking === false && board[r_b.y][r_b.x] === atk_vel_list[caseId].pieces[pieceId]) {
                        isMate = true;
                        bStopChecking = true;
                    }
                }

                if (isMate) break;
            }

            if (isMate) break;
        }

        if (isMate) break;
    } // wanted to use goto, it didn't work too well with my IDE, so I had to use this ugly approach

    // this loop needs to be separate, as it looks at points, not rays
    for (let caseId = 0; caseId < atk_pos_list.length; caseId++) {
        let wStopChecking = false, bStopChecking = false;

        for (let positionId = 0; positionId < atk_vel_list[caseId].positions.length; positionId++) {

            let r_w = white_king + atk_vel_list[caseId].positions[positionId];
            let r_b = black_king + atk_vel_list[caseId].positions[positionId];

            // check for: not being out of bounds
            if (!(0 < r_w.x && r_w.x < 7) || !(0 < r_w.y && r_w.y < 7))
                continue;

            // check for: not being out of bounds
            if (!(0 < r_b.x && r_b.x < 7) || !(0 < r_b.y && r_b.y < 7))
                continue;

            for (let pieceId = 0; pieceId < atk_vel_list[caseId].pieces.length; pieceId++) {
                if (wStopChecking === false && board[r_w.y][r_w.x] === atk_vel_list[caseId].pieces[pieceId]) {
                    isMate = true;
                    wStopChecking = true;
                }
                if (bStopChecking === false && board[r_b.y][r_b.x] === atk_vel_list[caseId].pieces[pieceId]) {
                    isMate = true;
                    bStopChecking = true;
                }
            }

            // check for: line of sight
            if (board[r_w.y][r_w.x] !== pe.BLANK)
                wStopChecking = true;

            // check for: line of sight
            if (board[r_b.y][r_b.x] !== pe.BLANK)
                bStopChecking = true;

            if (isMate) break;
        }

        if (isMate) break;

    }

    return isMate;
}

/**
 * returns 'true' if there is space and 'false' if there is none
 * @param boardId - board's identifier hash
 * @param f_x - x of the initial position
 * @param f_y - y of the initial position
 * @param t_x - x of the desired position
 * @param t_y - y of the desired position
 * @returns {boolean} - 'true' if there is space
 */
function checkForSpace(boardId, {f_x, f_y}, {t_x, t_y}) {
    let board = board_db.get(boardId).board

    let pieceId = board.board[f_y][f_x]
    let targetPieceId = board.board[t_y][t_x]

    let pieceCol = getColor(pieceId)
    let targetPieceCol = getColor(targetPieceId)

    let isSpace = true
    let checkedIt = false

    // initial checks before any of the loops happen
    // is the target square opposite color? pe.B_K is the first black piece in the enum.
    if (pieceCol === targetPieceCol) {
        isSpace = false;
        checkedIt = true;
    }

    // check which piece is 'piece_id' pointing to, then cast a ray in that direction
    for (let i = 0; checkedIt === false, i < mov_vel_list; i++) {
        for (let pieceVariant = 0; pieceVariant < mov_vel_list[i].pieces.length; pieceVariant++) {
            // find the correct piece
            if (mov_vel_list[i].pieces[pieceVariant] === pieceId) {

                /// cast a ray until it reaches the x, y; if it doesn't, that's just bad luck.
                // get the distance, multiply every ray by said distance,
                // this will help us simply choose the correct ray to cast.
                // Cast it, until the destination or an obstacle is met

                checkedIt = true;
                break;
            }
        }
    }

    return isSpace
}

/**
 * creates a new board and pushes it to the board_db
 * @param whiteUser - white user's identification hash
 * @param blackUser - black user's identification hash
 * @returns {string} - hash of the created board
 */
function makeBoard(whiteUser, blackUser) {
    let boardId = crypto.randomBytes(32).toString('hex');

    let newBoard = blankBoardPrefab

    newBoard.boardId = boardId
    newBoard.whiteId = whiteUser
    newBoard.blackId = blackUser

    lock.writeLock('board_db', function (release) {
        // 16.12: removed references to board_db.json

        board_db.set(boardId, newBoard)

    });

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
    let output;

    // only checks for space
    let isMovePossible = checkForSpace(boardId, {f_x, f_y}, {t_x, t_y})

    // a number (Enum), a move can mate either player, or even both at the same time
    let isMoveMating = checkForMate(boardId)

    /// modify the board and save the results

    return output;
}

/**
 * finalizes the match creation, does not return anything
 * @param boardId - hash ID of the appropriate board
 * @param secondPlayer - introduced player's ID hash
 */
function startMatch(boardId, secondPlayer) {

}

app.post('/createGame', (req, res) => {
    let creatorID = undefined; // TODO: >>> get this from the request
    let whiteUser = undefined, blackUser = undefined;

    Math.random() < 0.5 ? whiteUser = creatorID : blackUser = creatorID;

    // Advertise, then use makeMatch
    // write both req and res to the advertisement file, as soon as someone joins, reactivate both req and res and send them an OK as well as the board id
    let boardID = makeBoard(whiteUser, blackUser);

    res.write(JSON.stringify({boardID: boardID}))
    res.writeHead(200)
    res.send()
});

/**
 * will cache GET getMove request, based on who requested it
 * @param req - http request
 * @param res - http response, to be cached
 */
function initGetMove(req, res) {
    //player_db.get( /**/ )
}

/**
 * will send cached GET getMove request, called right after receiving a move from an opponent
 * @param boardId - hash ID of the appropriate board
 */
function finishGetMove(boardId) {

}

app.get('/getMove', (req, res) => {
    // waiting request, responded to when available, could be minutes before response
    // cache the request, then respond only after receiving a valid move from the enemy
    // JSON [from] [to]

    res.writeHead(200);
    res.send();
});

app.post('/makeMove', async (req, res) => {
    let boardId, moveFrom, moveTo; // TODO: >>> get this from the request

    console.log("OK: move made: " + {boardId, moveFrom, moveTo});

    if (await makeMove(boardId, moveFrom, moveTo)) {
        res.writeHead(200);
    }   else {
        // move could not be made
        res.writeHead(400);
    }

    // 200 or 400
    res.send();
});

app.post('/register', (req, res) => {
    let {email, username, password, passwordRepeat} = req.body

    // password repeat should be checked locally, and the 'register' button should just get greyed out

    let newUser = blankPlayerPrefab
    newUser.username = username

    // gen salt, hash the password
    bcrypt.genSalt(10, function(err, salt) {
        bcrypt.hash(password, salt, function(err, hash) {
            newUser.password = hash
        });
    });

    // add the account
    player_db.set(email, newUser)

    // and respond with the landing page
    res.write(fs.readFileSync('client/index.html', 'utf8'))
    res.send()
});

// how do I send multiple files? when another file is linked to index.html, the request for it is auto sent to the server
// I need to respond to /style.css get request with style.css file. this is done automatically if I use .static() function
app.get('/', function (req, res) {
    res.writeHead(200);
    res.write(fs.readFileSync('client/index.html', 'utf8'));
    res.send();
});

// load main db
// TODO: >>> implement auto-saving every move, ideally running on a separate thread


let server = app.listen(3000);
console.log("server started on port: 3000");