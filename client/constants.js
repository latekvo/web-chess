// todo: link this file to server.js


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
    INVALID_PASSWORD: 0,

    SESSION_TIMED_OUT: 0,

    BAD_REQUEST: 0,

    MATCH_ENDED: 0,

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
const blankBoardPrefab = [
    [pe.W_R, pe.W_N, pe.W_B, pe.W_K, pe.W_Q, pe.W_B, pe.W_N, pe.W_R], // 1 (0)
    [pe.W_P],
    [pe.BLANK],
    [pe.BLANK],
    [pe.BLANK],
    [pe.BLANK],
    [pe.B_P],
    [pe.B_R, pe.B_N, pe.B_B, pe.B_K, pe.B_Q, pe.B_B, pe.B_N, pe.B_R] // 8 (7)
]

for (let y = 1; y < 7; y++) {
    for (let x = 1; x < 8; x++) {
        blankBoardPrefab[y].push(blankBoardPrefab[y][0])
    }
}