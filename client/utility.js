// NOTE: this is 100% duplicate code for development purposes only, more details @ constants.js:1:1

// mostly functions copied from the server.js
// they are lengthy and I don't want to clutter up main.js file

// if everything works correctly, copy 'checkMove' here for client-side's use

function getColor(piece_id) {
    if (piece_id < 0)
        return piece_id

    if (piece_id < pe.B_K)
        return pe.WHITE

    return pe.BLACK
}

// rewrite this if possible, it's just a quick hack
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
// returns >0 if everything is ok
// returns -1 if there is no special behaviour detected
function checkSpecialCondition(executeMove = false) {
    // using these redundancies so that this code can be easily copied to the server side
    let board = localPlayingField
    let color = localPieceColor

    if (initTarget === undefined) {
        return -1
    }

    let f_x = parseInt(initTarget.dataset.x),
        f_y = parseInt(initTarget.dataset.y)

    let t_x, t_y

    let finalOutput = -1
    let outputIndex = -1
    specialPositions.forEach((rawBehaviour, index) => {

        // nothing else seems to word, is it really this hard to just copy by value in JS?
        // only other options i see require external libraries wtf
        let behaviour = JSON.parse(JSON.stringify(rawBehaviour))

        let matchSize_x = behaviour.match[0].length,
            matchSize_y = behaviour.match.length

        // reverse all checks for blacks, not efficient at all but far simpler than anything else
        if (color === pe.BLACK) {
            behaviour.match.reverse()
            behaviour.match.forEach((arr) => arr.reverse())
            behaviour.result.reverse()
            behaviour.result.forEach((arr) => arr.reverse())

            // these are all offsets
            behaviour.eventPosition.x = matchSize_x - behaviour.eventPosition.x - 1
            behaviour.eventPosition.y = matchSize_y - behaviour.eventPosition.y - 1
            behaviour.clickPosition.x = matchSize_x - behaviour.clickPosition.x - 1
            behaviour.clickPosition.y = matchSize_y - behaviour.clickPosition.y - 1

            // board_size - match_pos - (match_size - 1)
            // ex: 7 - 1 - 3 + 1 = 4
            if (behaviour.matchPosition.x !== -1)
                behaviour.matchPosition.x = 7 - behaviour.matchPosition.x - matchSize_x + 1
            if (behaviour.matchPosition.y !== -1)
                behaviour.matchPosition.y = 7 - behaviour.matchPosition.y - matchSize_y + 1
        }

        let eventPosOffset_x = behaviour.eventPosition.x,
            eventPosOffset_y = behaviour.eventPosition.y

        let matchPos_x = behaviour.matchPosition.x,
            matchPos_y = behaviour.matchPosition.y

        let eventPosTrue_x, eventPosTrue_y

        // if the variable is known, just set it,
        // for wildcard variables, substitute them with mouseclick's position and check if everything checks out

        if (matchPos_x !== -1) {
            eventPosTrue_x = matchPos_x + eventPosOffset_x
        } else {
            eventPosTrue_x = f_x
            matchPos_x = eventPosTrue_x - eventPosOffset_x
        }

        if (matchPos_y !== -1) {
            eventPosTrue_y = matchPos_y + eventPosOffset_y
        } else {
            eventPosTrue_y = f_y
            matchPos_y = eventPosTrue_y - eventPosOffset_y
        }

        let r_bound_x = matchPos_x + matchSize_x - 1,
            r_bound_y = matchPos_y + matchSize_y - 1

        // if the positions match up
        if (eventPosTrue_x === f_x && eventPosTrue_y === f_y) {
            t_x = matchPos_x + behaviour.clickPosition.x
            t_y = matchPos_y + behaviour.clickPosition.y
            outputIndex = index
        }

        let doesMatchUp = true
        let match = behaviour.match

        /*
        console.log('current behaviour check: ' + index + ' / ' + specialPositions.length)
        console.log(behaviour)
        */

        // make sure the whole 'match' and 'result' matches up
        for (let y = 0; y < matchSize_y && doesMatchUp; y++) {
            let true_y = matchPos_y + y

            for (let x = 0; x < matchSize_x && doesMatchUp; x++) {
                let true_x = matchPos_x + x

                let matchPiece = match[y][x]

                switch (matchPiece) {
                    case pe.ANY:
                        break
                    case pe.ANY_HOSTILE:
                        let squareColor = getColor(board[true_y][true_x])
                        if (color === squareColor || board[true_y][true_x] === pe.BLANK)
                            doesMatchUp = false
                        break
                    default:
                        if (color === pe.BLACK)
                            matchPiece = invPe.get(matchPiece)

                        if (matchPiece !== board[true_y][true_x])
                            doesMatchUp = false
                        break
                }

            }
        }

        // but cancel that output if the position would have to be out of bounds
        if (!doesMatchUp || matchPos_x < 0 || r_bound_x > 7 || matchPos_y < 0 || r_bound_y > 7 ) {
            outputIndex = -1
            return
        }

        if (outputIndex !== -1) {
            finalOutput = 0
        }

            // if this is just a move-preview, return, otherwise, apply the position
        if (endTarget === undefined) {
            if (outputIndex !== -1) {
                finalOutput = 0

                console.log('special indication')
                console.log(t_x + ' ' + t_y)

                let hor = String.fromCharCode('a'.charCodeAt(0) + t_x),
                    ver = String(t_y + 1)

                let id = hor + ver

                console.log('special id: ' + id)

                markSquare(id)

            }

            return
        }

        let checkedX = parseInt(endTarget.dataset.x),
            checkedY = parseInt(endTarget.dataset.y)

        console.log('will move specially: ')
        console.log(endTarget)
        console.log('is undefined: ' + (endTarget === undefined))
        console.log('is move on the list: ' + (outputIndex !== -1))
        console.log('should we apply: ' + executeMove)
        console.log('move check: x ' + t_x + ' ' + checkedX)
        console.log('move check: y ' + t_y + ' ' + checkedY)
        if (executeMove && outputIndex !== -1 && checkedX === t_x && checkedY === t_y) {
            // execute the move as long as doesMatchUp = true, endPos = clickPos, initPos already checked
            console.log('specially moved locally')
            console.log(f_x + ' ' + f_y)
            console.log(t_x + ' ' + t_y)

            localPlayingField[t_y][t_x] = localPlayingField[f_y][f_x]
            localPlayingField[f_y][f_x] = pe.BLANK

            if (localPieceColor === pe.WHITE)
                localPieceColor = pe.BLACK
            else
                localPieceColor = pe.WHITE

            drawBoard()
        }

        outputIndex = -1
    })

    return finalOutput
}

let rayCastBlobbedSquares = []

function markSquare(id) {
    let htmlElement = document.getElementById(id)
    htmlElement.style.borderRadius = '35%'
    rayCastBlobbedSquares.push(htmlElement)
}

function castRay(initElement) {
    endTarget = undefined // this sometimes bugs out and needs to be fixed here
    checkSpecialCondition() // does the same thing but for the special conditions

    if (initElement === undefined || initElement === null)
        return

    let x = parseInt(initElement.dataset.x),
        y = parseInt(initElement.dataset.y)


    let pieceId = localPlayingField[y][x]

    let {pieceIt, isPosBased} = getPieceIt(pieceId)

    console.log('pieceIt: ' + pieceIt)

    // this is the correct style, add these elements to the rayCastBlobbedSquares
    if (!isPosBased) {
        console.log('move type: vel')
        // CAST A RAY
        mov_vel_list[pieceIt].velocities.forEach((e) => {

            let r_x = x, r_y = y

            r_x += e[0]
            r_y += e[1]

            while (!(r_x < 0 || r_x > 7 || r_y < 0 || r_y > 7 )) {

                let hor = String.fromCharCode('a'.charCodeAt(0) + r_x)

                let ver = String(r_y + 1)

                let id = hor + ver

                if (getColor(localPlayingField[r_y][r_x]) === localPieceColor)
                    break

                markSquare(id)

                if (localPlayingField[r_y][r_x] !== pe.BLANK)
                    break

                r_x += e[0]
                r_y += e[1]
            }
        })
    } else {
        console.log('move type: pos')
        // DOT EVERY POSITION
        mov_pos_list[pieceIt].positions.forEach((e) => {

            let hor = x + e[0],
                ver = y + e[1]

            if (hor < 0 || hor > 7 || ver < 0 || ver > 7 )
                return

            // block friendly-fire marks
            let origSquarePiece = localPlayingField[y][x]
            let destSquarePiece = localPlayingField[ver][hor]
            let destSquareColor = getColor(destSquarePiece)
            if (localPieceColor === destSquareColor)
                return

            // the pawn cannot move when there's an enemy in front of it
            if (origSquarePiece === pe.W_P && localPieceColor === pe.WHITE ||
                origSquarePiece === pe.B_P && localPieceColor === pe.BLACK) {

                // first, mark any possible attack positions
                atk_pos_list[pieceIt].positions.forEach((e_atk) => {
                    let hor_atk = x + e_atk[0],
                        ver_atk = y + e_atk[1]

                    console.log('checked pawn atk: ' + hor_atk + ver_atk)

                    if (hor_atk < 0 || hor_atk > 7 || ver_atk < 0 || ver_atk > 7 )
                        return

                    // only mark the square if there is a piece to be attacked
                    let moveToColor = getColor(localPlayingField[ver_atk][hor_atk])

                    if (moveToColor !== localPieceColor && moveToColor !== pe.BLANK) {

                        hor_atk = String.fromCharCode('a'.charCodeAt(0) + hor_atk)
                        ver_atk = String(ver_atk + 1)

                        let id_atk = hor_atk + ver_atk

                        markSquare(id_atk)
                    }

                })
                // second, de-mark any forward moves if the space in-front of the pawn is blocked

                if (localPlayingField[ver][hor] !== pe.BLANK)
                    return
            }

            console.log('hor: ' + hor + ' ver: ' + ver)

            hor = String.fromCharCode('a'.charCodeAt(0) + hor)
            ver = String(ver + 1)

            let id = hor + ver

            markSquare(id)
        })
    }
}

/// FOLLOWING CODE IS UP TO CHANGE, NOT FULLY TESTED YET - CURRENTLY BEING TESTED
/// REMEMBER TO SYNC THIS, AND SERVER SIDE CODE
// todo: as soon as there is some time, remove this whole function and just use a single function for drawing, checking and moving
//  having same code but in different format all over the place causes an unnecessary amount of trouble

function checkMove(f_x, f_y, t_x, t_y) {
    let isSpecial = checkSpecialCondition()
    if (isSpecial !== -1) {
        console.log('move is special: ' + isSpecial)
        return boardState.UNRESOLVED
    }

    let board = localPlayingField

    console.log('f: ' + f_x + ' ' + f_y)
    console.log('t: ' + t_x + ' ' + t_y)

    let pieceId = board[f_y][f_x]
    let pieceCol = getColor(pieceId)

    // CHECK FOR POSSIBILITY OF A MOVE
    // ray-cast - check for obstacles
    // pos-check - check for friendlies at the destination

    // find piece's iterator in the mov_vel_list or mov_pos_list
    let {pieceIt, isPosBased} = getPieceIt(pieceId)

    // error, request corrupted, the square is blank
    if (pieceIt === -1) {
        console.log('tried moving a blank space')
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

        // check if the ray is present in piece's move list
        let isMovePresent = false
        atk_vel_list[pieceIt].velocities.forEach((vel) => {
            if (vel[0] === vel_x && vel[1] === vel_y)
                isMovePresent = true
        })

        // cast the ray
        while (ray.x >= 0 && ray.x < 8 && ray.y >= 0 && ray.y < 8 && isMovePresent) {

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

        // firstly, check everything pawn-related

        // block friendly-fire marks
        let origSquarePiece = localPlayingField[f_y][f_x]
        let destSquarePiece = localPlayingField[t_y][t_x]
        let destSquareColor = getColor(destSquarePiece)

        // the pawn cannot move when there's an enemy in front of it
        if (origSquarePiece === pe.W_P || origSquarePiece === pe.B_P) {
            let mask_x = t_x - f_x,
                mask_y = t_y - f_y

            console.log('checking pawn positions')

            // if there is a lateral offset, check if there is a piece to be taken
            if (mask_x !== 0 && destSquareColor !== localPieceColor && destSquarePiece !== pe.BLANK) {
                atk_pos_list[pieceIt].positions.forEach((pos) => {
                    if (mask_x === pos[0] &&
                        mask_y === pos[1]) {
                        isMovePossible = true
                    }
                })
            }

            // normal movement is also allowed
            if (mask_x === 0 && destSquarePiece === pe.BLANK) {
                mov_pos_list[pieceIt].positions.forEach((pos) => {
                    if (mask_x === pos[0] &&
                        mask_y === pos[1]) {
                        isMovePossible = true
                    }
                })

            }
        } else {
            // if it's not a pawn which can be blocked, check everything else

            // vec from f to t
            let mask_x = t_x - f_x,
                mask_y = t_y - f_y

            // and just check if there exists a fitting mask for such a move
            for (let i = 0; i < mov_pos_list[pieceIt].positions.length; i++) {

                if (mask_x === mov_pos_list[pieceIt].positions[i][0] &&
                    mask_y === mov_pos_list[pieceIt].positions[i][1]) {

                    console.log('move determined possible')

                    isMovePossible = true
                    break
                }
            }
        }
    }

    // move will be impossible if both pieces are the same color
    if (pieceCol === getColor(board[t_y][t_x])) {
        isMovePossible = false
        console.log('tried moving pieces into each other')
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
                        console.log('data causing check: pieceId: ' + pieceId + ' caseId: ' + caseId)
                        isWhiteMated = true;
                        wStopRay = true;
                    }
                    if (bStopRay === false && board[ray_b.y][ray_b.x] === atk_vel_list[caseId].pieces[pieceId] &&
                        getColor(atk_vel_list[caseId].pieces[pieceId]) === pe.WHITE) {
                        console.log('data causing check: pieceId: ' + pieceId + ' caseId: ' + caseId)
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

    console.log('move check OK: code ' + output)
    return output;
}