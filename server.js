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
let blankBoardPrefab = [
    [pe.W_R, pe.W_N, pe.W_B, pe.W_K, pe.W_Q, pe.W_B, pe.W_N, pe.W_R] // 1 (0)
    [pe.W_P],
    [pe.BLANK],
    [pe.BLANK],
    [pe.BLANK],
    [pe.BLANK],
    [pe.B_P],
    [pe.B_R, pe.B_N, pe.B_B, pe.B_K, pe.B_Q, pe.B_B, pe.B_N, pe.B_R], // 8 (7)
]

for (let y = 1; y < 7; y++) {
    for (let x = 1; x < 8; x++) {
        blankBoardPrefab[y].push(blankBoardPrefab[y][0])
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
    { pieces: [pe.W_K, pe.B_K], velocities: [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]] },
    { pieces: [pe.W_N, pe.B_N], velocities: [[-1, 2], [1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1]] },
    { pieces: [pe.W_P], velocities: [[-1, 1], [1, 1]] },
    { pieces: [pe.B_P], velocities: [[-1, -1], [1, -1]] }
]

// takes an array as the input returns 0 if there is no mate, 1 if there is
function checkForMate(board) {
    // * find kings
    // * cast horizontal, vertical and diagonal rays from the king
    // * if there is an attacking element in the way of the ray, announce a check
    // * only way to lose (for simplicity) is to resign, so if the king can't move, he needs to resign.
    let white_king, black_king

    for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
            if (board[y][x] === pe.W_K) {
                white_king = [x, y]
            }
            if (board[y][x] === pe.B_K) {
                black_king = [x, y]
            }
        }
    }

    // todo: implement error checking for - no kings detected

    for (let caseId = 0; caseId < atk_vel_list.length; caseId++) {

    }

    for (let caseId = 0; caseId < atk_pos_list.length; caseId++) {

    }
}

// returns 1 if there is space, 0 if there is not
function checkForSpace() {

}

async function makeBoard({boardId, moveFrom, moveTo}) {

    fs.writeFile(boardId, JSON.stringify(blankBoardPrefab), function (err) {
        if (err) throw err;
        console.log('Saved!');
    });

}

async function makeMove({boardId, moveFrom, moveTo}) {

}

app.get('/newGame', (req, res) => {
    // JSON [from] [to]

    res.writeHead(200);
    res.write(fs.readFileSync('assets/register.html', 'utf8'));
    res.send();
});

// waiting request, responded to when available, could be minutes before response
app.get('/getMove', (req, res) => {
    // JSON [from] [to]

    res.writeHead(200);
    res.write(fs.readFileSync('assets/register.html', 'utf8'));
    res.send();
});

app.post('/makeMove', async (req, res) => {
    let {boardId, moveFrom, moveTo} = req.body;

    console.log("move made: " + {boardId, moveFrom, moveTo});

    let response = await makeMove({boardId, moveFrom, moveTo});

    // 200 or 300
    res.writeHead(response);
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