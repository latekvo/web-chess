// TODO: MOVE THIS, AND utility.js FILE TO THE MAIN FOLDER, SO THAT BOTH THE SERVER AND THE CLIENT CAN ACCESS THEM EASILY
// for now, for testing, these files will be duplicated, a copy for the server, and for the client

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
    [pe.W_R, pe.W_N, pe.W_B, pe.W_Q, pe.W_K, pe.W_B, pe.W_N, pe.W_R], // 1 (0)
    [pe.W_P],
    [pe.BLANK],
    [pe.BLANK],
    [pe.BLANK],
    [pe.BLANK],
    [pe.B_P],
    [pe.B_R, pe.B_N, pe.B_B, pe.B_Q, pe.B_K, pe.B_B, pe.B_N, pe.B_R] // 8 (7)
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