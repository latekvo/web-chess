// node.js chess web server
// partially recycled from my 'viva-forums' project

let http = require('http');
let events = require("events");
let fs = require('fs');

let bodyParser = require('body-parser')
let cookieParser = require('cookie-parser');

// we'll try express atop of what's already here, it may be useful
let express = require('express');
let app = express();
let crypto = require("crypto");

app.use(express.static(__dirname + '/client/'));
app.use(bodyParser.urlencoded({extended : true}));
app.use(cookieParser());

const pieceEnum = {
    BLANK: -1,
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
};

let pe = pieceEnum;

// this will be far simpler for using checkForMate() as compared to a list-of-pieces approach
let blankBoardPrefab = {
    boardId: undefined, // main key

    // foreign keys of both players
    whiteId: undefined,
    blackId: undefined,

    moveList: [], // [ [from, to], [from, to] ]

    board: [
        [pe.W_R, pe.W_N, pe.W_B, pe.W_K, pe.W_Q, pe.W_B, pe.W_N, pe.W_R] // 1 (0)
        [pe.W_P],
        [pe.BLANK],
        [pe.BLANK],
        [pe.BLANK],
        [pe.BLANK],
        [pe.B_P],
        [pe.B_R, pe.B_N, pe.B_B, pe.B_K, pe.B_Q, pe.B_B, pe.B_N, pe.B_R], // 8 (7)
    ]
}

for (let y = 1; y < 7; y++) {
    for (let x = 1; x < 8; x++) {
        blankBoardPrefab[y].push(blankBoardPrefab.board[y][0])
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

// takes an array as the input returns 'false' if there is no mate, 'true' if there is
function checkForMate(board) {
    // * find kings
    // * cast horizontal, vertical and diagonal rays from the king
    // * if there is an attacking element in the way of the ray, announce a check
    // * only way to lose (for simplicity) is to resign, so if the king can't move, he needs to resign.
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

    // todo: implement error checking for - no kings detected

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

// returns 1 if there is space, 0 if there is not
function checkForSpace() {

}

async function makeBoard() {
    let boardId = crypto.randomBytes(32).toString('hex');

    let newBoard = blankBoardPrefab;
    newBoard.boardId = boardId

    let board_db;
    fs.readFile('board_db.json', function (err, data) {
        if (err) {
            console.log("ERROR: Couldn't read the db file, match ID: " + boardId);
            throw err;
        }
        // TODO ASAP: data is a json, one of it's fields contains the desired data, figure out which one
        console.log(data);
        //board_db = JSON.parse(data);
    });

    fs.writeFile('board_db.json', JSON.stringify(board_db), function (err) {
        if (err) {
            console.log("ERROR: Couldn't write to board_db.json. Match ID: " + boardId);
            throw err;
        }
        console.log('OK: created a new match and saved to board_db.json, ID: ' + boardId);
    });

    return boardId;
}

async function makeMove({boardId, moveFrom, moveTo}) {
    let board = JSON.parse(
        await fs.promises.readFile(
            'boards/' + boardId,
            { encoding : 'utf8'}
        )
    );
}

async function startMatch({boardId, firstPlayer, secondPlayer}) {

}

app.post('/createGame', (req, res) => {

    // Advertise, then use makeMatch
    // write both req and res to the advertisement file, as soon as someone joins, reactivate both req and res and send them an OK as well as the board id

    res.writeHead(200);
    res.send();
});

app.get('/getMove', (req, res) => {
    // waiting request, responded to when available, could be minutes before response
    // cache the request, then respond only after receiving a valid move from the enemy
    // JSON [from] [to]

    res.writeHead(200);
    res.write(fs.readFileSync('assets/register.html', 'utf8'));
    res.send();
});

app.post('/makeMove', async (req, res) => {
    let {boardId, moveFrom, moveTo} = req.body;

    console.log("OK: move made: " + {boardId, moveFrom, moveTo});

    if (await makeMove({boardId, moveFrom, moveTo})) {
        res.writeHead(200);
    }   else {
        // move could not be made
        res.writeHead(400);

    }

    // 200 or 300
    res.send();
});

// how do I send multiple files? when another file is linked to index.html, the request for it is auto sent to the server
// I need to respond to /style.css get request with style.css file. this is done automatically if I use .static() function
app.get('/', function (req, res) {
    res.writeHead(200);
    res.write(fs.readFileSync('client/index.html', 'utf8'));
    res.send();
});

let server = app.listen(3000);
console.log("server started on port: 3000");