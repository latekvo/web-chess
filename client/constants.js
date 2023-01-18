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

// any condition that may affect a chess field is stored here, besides just the pieces
const pieceEnum = {
    BLANK: -1,

    WHITE: -2,
    BLACK: -3,

    ANY: -4,
    ANY_HOSTILE: -5,
    UNCHANGED: -7,

    // universal pieces
    U_K: 20,
    U_Q: 21,
    U_R: 22,
    U_B: 23,
    U_N: 24,
    U_P: 25,

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

// universal pieces, they make special case matches easier, if (maskPiece == uniPe.get(testedPiece))
// this may come in handy some time later, of course this could be done by just adding / subtracting 6 to the number
let uniPe = new Map([
    [pe.W_K, pe.U_K],
    [pe.W_Q, pe.U_Q],
    [pe.W_R, pe.U_R],
    [pe.W_B, pe.U_B],
    [pe.W_N, pe.U_N],
    [pe.W_P, pe.U_P],
    [pe.B_K, pe.U_K],
    [pe.B_Q, pe.U_Q],
    [pe.B_R, pe.U_R],
    [pe.B_B, pe.U_B],
    [pe.B_N, pe.U_N],
    [pe.B_P, pe.U_P]
])

let invPe = new Map([
    [pe.W_K, pe.B_K],
    [pe.W_Q, pe.B_Q],
    [pe.W_R, pe.B_R],
    [pe.W_B, pe.B_B],
    [pe.W_N, pe.B_N],
    [pe.W_P, pe.B_P],
    [pe.B_K, pe.W_K],
    [pe.B_Q, pe.W_Q],
    [pe.B_R, pe.W_R],
    [pe.B_B, pe.W_B],
    [pe.B_N, pe.W_N],
    [pe.B_P, pe.W_P],
    [pe.WHITE, pe.BLACK],
    [pe.BLANK, pe.BLANK],
])
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

let mov_vel_list = JSON.parse(JSON.stringify(atk_vel_list)) // duplicate for ease of use and ease of readability
let mov_pos_list = JSON.parse(JSON.stringify(atk_pos_list)) // modified pawn behaviour compared to atk_pos_list

// replace movement options for pawns, from diagonal to vertical
mov_pos_list[2].positions = [[0, 1]]
mov_pos_list[3].positions = [[0, -1]]

const specialBehaviour = {
    NONE: 0,

    PAWN_FIRST_MOVE: 1, // make sure it's the first move
    CASTLE: 2, // make sure neither pieces have been moved
    EN_PASSANT: 3, // only available one time - the first time this pattern appears
    PROMOTE: 4, // for now, it will auto-promote to a queen
}

/* Whole JSON format description
{
    specialRule: specialBehaviour // enum indicating special hardcoded checks that have to be done
    clickPosition: { x, y } // RELATIVE to 'match', which square is clickable
    matchPosition: { x, y } // RELATIVE to 'board', where the 'match' box begins---
    eventPosition: { x, y } // RELATIVE to 'match', which square activates this special behaviour event
    match: [] // [y][x] array that represents the required position for this event to take place
    result: [] // [y][x] array that represents end state of this special event
}
*/

// for black pieces, all pieces are inverted, all known positions are inverted as well, (i.e.: 0 -> 7, 6 -> 1)
// while this file is unnecessarily long,
//  it's way easier to write and then parse than treat each of these events with separate code
const specialPositions = [
    { // pawn's first move
        specialRule: specialBehaviour.PAWN_FIRST_MOVE,

        // IMPORTANT, click position is RELATIVE to match's bounds
        // this is done to counter certain limitations of having an absolute position set here
        // this field represents the TO move
        clickPosition: {
            x: 0,
            y: 2
        },
        // on the other hand, these coords are ABSOLUTE, with -1 being treated as a wildcard
        matchPosition: {
            x: -1,
            y: 1
        },
        // only important for HTML, also RELATIVE, it shows which field needs to be clicked for the visual clue to show up,
        // this field represents the FROM move
        eventPosition: {
            x: 0,
            y: 0
        },
        match: [
            [pe.W_P], // y 1
            [pe.BLANK], // y 2
            [pe.BLANK] // y 3
        ],
        result: [
            [pe.BLANK], // y 1
            [pe.BLANK], // y 2
            [pe.W_P] // y 3
        ]
    },
    { // short castle
        specialRule: specialBehaviour.CASTLE,

        clickPosition: {
            x: 3,
            y: 0
        },
        matchPosition: {
            x: 4,
            y: 0
        },
        eventPosition: {
            x: 0,
            y: 0
        },
        match: [
            [pe.W_K, pe.BLANK, pe.BLANK, pe.W_R], // x: 0, y: 4 -> 7
        ],
        result: [
            [pe.BLANK, pe.W_R, pe.W_K, pe.BLANK],
        ]
    },
    { // long castle
        specialRule: specialBehaviour.CASTLE,

        clickPosition: {
            x: 0,
            y: 0
        },
        matchPosition: {
            x: 0,
            y: 0
        },
        eventPosition: {
            x: 4,
            y: 0
        },
        match: [
            [pe.W_R, pe.BLANK, pe.BLANK, pe.BLANK, pe.W_K], // x: 0, y: 0 -> 4
        ],
        result: [
            [pe.BLANK, pe.BLANK, pe.W_K, pe.W_R, pe.BLANK],
        ]
    },
    { // en passant, to the left
        specialRule: specialBehaviour.EN_PASSANT,

        clickPosition: {
            x: 0,
            y: 1
        },
        matchPosition: {
            x: -1,
            y: 4
        },
        eventPosition: {
            x: 1,
            y: 0
        },
        match: [
            [pe.B_P, pe.W_P],
            [pe.BLANK, pe.ANY]
        ],
        result: [
            [pe.BLANK, pe.BLANK],
            [pe.W_P, pe.UNCHANGED]
        ]
    },
    { // en passant, to the right
        specialRule: specialBehaviour.EN_PASSANT,

        clickPosition: {
            x: 1,
            y: 1
        },
        matchPosition: {
            x: -1,
            y: 4
        },
        eventPosition: {
            x: 0,
            y: 0
        },
        match: [
            [pe.W_P, pe.B_P],
            [pe.ANY, pe.BLANK]
        ],
        result: [
            [pe.BLANK, pe.BLANK],
            [pe.UNCHANGED, pe.W_P]
        ]
    },
    { // promotion
        specialRule: specialBehaviour.PROMOTE,

        clickPosition: {
            x: 0,
            y: 1
        },
        matchPosition: {
            x: -1,
            y: 6
        },
        eventPosition: {
            x: 0,
            y: 0
        },
        match: [
            [pe.W_P],
            [pe.BLANK]
        ],
        result: [
            [pe.BLANK],
            [pe.W_Q]
        ]
    },
    // i know these are very repeatable, but for me, it's just as simple as copy-pasting
    { // promotion, diag left
        specialRule: specialBehaviour.PROMOTE,

        clickPosition: {
            x: 0,
            y: 1
        },
        matchPosition: {
            x: -1,
            y: 6
        },
        eventPosition: {
            x: 1,
            y: 0
        },
        match: [
            [pe.ANY, pe.W_P],
            [pe.ANY_HOSTILE, pe.ANY]
        ],
        result: [
            [pe.UNCHANGED, pe.BLANK],
            [pe.W_Q, pe.UNCHANGED]
        ]
    },
    { // promotion, diag right
        specialRule: specialBehaviour.PROMOTE,

        clickPosition: {
            x: 1,
            y: 1
        },
        matchPosition: {
            x: -1,
            y: 6
        },
        eventPosition: {
            x: 0,
            y: 0
        },
        match: [
            [pe.W_P, pe.ANY],
            [pe.ANY, pe.ANY_HOSTILE]
        ],
        result: [
            [pe.BLANK, pe.UNCHANGED],
            [pe.UNCHANGED, pe.W_Q]
        ]
    },

]