// NOTE: this is 100% duplicate code for development purposes only, more details @ constants.js:1:1

// mostly functions copied from the server.js
// they are lengthy and I don't want to clutter up main.js file

// if everything works correctly, copy 'checkMove' here for client-side's use

function getColor(piece_id) {
    if (piece_id < 0)
        return pe.BLANK

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

let rayCastBlobbedSquares = []
function castRay(initElement) {
    if (initElement === undefined || initElement === null)
        return

    let x = parseInt(initElement.dataset.x),
        y = parseInt(initElement.dataset.y)

    let pieceId = localPlayingField[y][x]

    let {pieceIt, isPosBased} = getPieceIt(pieceId)

    console.log(pieceIt)

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

                console.log('id: ' + id)

                let htmlElement = document.getElementById(id)
                htmlElement.style.borderRadius = '35%'
                rayCastBlobbedSquares.push(htmlElement)

                r_x += e[0]
                r_y += e[1]
            }
        })
    } else {
        console.log('move type: pos')
        // DOT EVERY POSITION
        mov_pos_list[pieceIt].positions.forEach((e) => {

            let hor = x + e[0]
            /*if (localPieceColor === pe.BLACK)
                hor = 7 - hor*/

            let ver = y + e[1]
            /*if (localPieceColor === pe.WHITE)
                ver = 7 - ver*/

            if (hor < 0 || hor > 7 || ver < 0 || ver > 7 )
                return

            console.log('hor: ' + hor + ' ver: ' + ver)

            hor = String.fromCharCode('a'.charCodeAt(0) + hor)
            ver = String(ver + 1)

            let id = hor + ver

            let htmlElement = document.getElementById(id)
            htmlElement.style.borderRadius = '35%'
            rayCastBlobbedSquares.push(htmlElement)
        })
    }

}

/// FOLLOWING CODE IS UP TO CHANGE, NOT FULLY TESTED YET - CURRENTLY BEING TESTED
/// REMEMBER TO SYNC THIS, AND SERVER SIDE CODE

function checkMove(f_x, f_y, t_x, t_y) {
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

        console.log('ray origin x: ' + ray.x + ' y: ' + ray.y)

        // iterate the ray
        ray.x += vel_x
        ray.y += vel_y

        // cast the ray
        while (ray.x >= 0 && ray.x < 8 && ray.y >= 0 && ray.y < 8) {

            // reached the destination
            if (ray.x === t_x && ray.y === t_y) {
                isMovePossible = true
                console.log('ray-cast successful, found the enemy')
                break
            }

            // check for: line of sight
            if (board[ray.y][ray.x] !== pe.BLANK) {
                console.log('ray-cast unsuccessful, encountered an obstacle')
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

        console.log('pattern mask x: ' + mask_x + ' y: ' + mask_y)

        // and just check if there exists a fitting mask for such a move
        for (let i = 0; i < mov_pos_list[pieceIt].positions.length; i++) {

            console.log('checking against x: ' + mov_pos_list[pieceIt].positions[i][0] + ' y: ' + mov_pos_list[pieceIt].positions[i][1])

            if (mask_x === mov_pos_list[pieceIt].positions[i][0] &&
                mask_y === mov_pos_list[pieceIt].positions[i][1]) {

                console.log('move determined possible')

                isMovePossible = true
                break
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

    console.log('move check OK: code ' + output)
    return output;
}