/**
 * Created by Administrator on 14-3-1.
 */
var poker = require('../model/poker')
    , _ = require('lodash');



module.exports = function (socket,userList,desks) {

    var session = socket.handshake.session,
        identity,
        indexInDesk,
        indexOfDesk;//此人在多少桌



    if (userList[session.user]) {
        return;
    }

    if (!desks.length) {
        desks.push({})
    }

    var hasDeskFree = false;

    for (var i = 0; i < desks.length; i++) {
        for (var j = 0; j < 3; j++) {
            if (!desks[i][j]) {
                desks[i][j] = {
                    user: session.user
                };
                hasDeskFree = true;
                userList[session.user] = {
                    desk: i,
                    index: j
                }

                indexInDesk = j;
                indexOfDesk = i;
                break;
            }
        }
        if (hasDeskFree) break;
    }

    if (!hasDeskFree) {
        desks.push({
            0: {
                user: session.user
            }
        })

        userList[session.user] = {
            desk: desks.length - 1,
            index: 0
        }

        indexInDesk = 0;
        indexOfDesk = desks.length - 1;
    }



    var deskPrepare = desks[indexOfDesk],//等待开局的桌子
        personPrepare = true;//是否满员需要开局

    if (deskPrepare['2']) {
        for (var personIndex = 0; personIndex < deskPrepare.length; personIndex++) {
            if (!deskPrepare[personIndex]) {
                personPrepare = false;
                break;
            }
        }
    } else {
        personPrepare = false;
    }

    socket.emit('room-in', session.user);

    var pokerDB ,//总的牌数组
        userPorkers,//每个用户的牌
        firstPick ,//第一个抢地主的人
        time = 15;//需要等待的时间

    if (personPrepare) {
        start()
    }

    function start() {
        pokerDB = poker();
        firstPick = _.random(0, 2);
        deskPrepare.landlordCards = pokerDB.landlordCards;

        for (var i = 0; i < 3; i++) {
            userPorkers = pokerDB.usersPorker[i];
            deskPrepare[i].porkers = userPorkers;

            if (deskPrepare[i].user === session.user) {
                socket.emit('init-poker-' + deskPrepare[i].user, userPorkers);
            } else {
                socket.broadcast.emit('init-poker-' + deskPrepare[i].user, userPorkers);
            }

        }


        //第一顺位，开始抢地主
        if (deskPrepare[firstPick].user === session.user) {
            //如果第一个抢地主，将不会发送给自己上下家抢地主时间线
            socket.emit('start-grab-landlord-' + deskPrepare[firstPick].user, time);

            //如果是自己抢地主，将会触发等待抢地主事件
            for (var i = 0; i < 3; i++) {
                if (deskPrepare[i].user != session.user) {
                    socket.broadcast.emit('wait-for-grab-' + deskPrepare[i].user, [i, firstPick, time]);
                }
            }

        } else {
            socket.broadcast.emit('start-grab-landlord-' + deskPrepare[firstPick].user, time);

            //如果不是自己抢地主，将会触发自己和另外一个人的等待抢地主事件
            for (var i = 0; i < 3; i++) {
                if (firstPick != i) {
                    if (deskPrepare[i].user === session.user) {
                        socket.emit('wait-for-grab-' + deskPrepare[i].user, [i, firstPick, time]);
                    } else {
                        socket.broadcast.emit('wait-for-grab-' + deskPrepare[i].user, [i, firstPick, time]);
                    }
                }
            }
        }
    }

    /*  socket.on('next-grab',function(prevGraber){
     emitNextGrab(prevGraber);
     });*/

    //触发下家抢地主
    function emitNextGrab(prevGraber) {
        var deskIndex = userList[prevGraber].desk,
            desk = desks[deskIndex],
            _indexInDesk = userList[prevGraber].index,
            graberIndex,
            prevUser,
            nextGraber;


        //判断是否是自己一桌的
        if (deskIndex != indexOfDesk) {
            return;
        }

        //indexinDesk =
        graberIndex = (_indexInDesk + 1) % 3;
        prevUser = _indexInDesk === 0 ? 2 : _indexInDesk - 1;

        //触发下家的抢地主事件
        nextGraber = desk[graberIndex].user;
        socket.broadcast.emit('start-grab-landlord-' + nextGraber, time);

        //还要触发自己和上家的等待事件
        socket.emit('wait-for-grab-' + prevGraber, [0, 1, time]);
        socket.broadcast.emit('wait-for-grab-' + desk[prevUser].user, [1, 0, time]);
    }

    //抢地主事件
    socket.on('grab', function (isGrab) {
        var desk = desks[indexOfDesk],
            grabLevel = desk[indexInDesk].grabLevel,
            next = (indexInDesk + 1) % 3,
            nextUser;

        if (grabLevel === undefined) {
            desk[indexInDesk].grabLevel = isGrab ? 1 : -1;
            if (isGrab) {
                //下家没有抢地主继续下家，否则下家抢地主
                if (desk[next].grabLevel === -1) {
                    if (desk[(next + 1) % 3].grabLevel === -1) {
                        grabSuccess(desk, indexInDesk);
                    } else {
                        emitNextGrab(desk[next].user);
                    }
                } else {
                    emitNextGrab(session.user);
                }
            } else {
                if (desk[next].grabLevel === 1) {
                    if (desk[(next + 1) % 3].grabLevel === -1) {
                        grabSuccess(desk, next);
                    } else {
                        emitNextGrab(desk[next].user);
                    }
                } else if (desk[next].grabLevel === undefined) {
                    emitNextGrab(session.user);
                } else {
                    if (desk[(next + 1) % 3].grabLevel === 1) {
                        grabSuccess(desk, (next + 1) % 3);
                    } else {
                        start();
                    }
                }
            }

        } else if (grabLevel === -1) {//这应该是走不到的
            // emitNextGrab(session.user);
        } else {
            if (isGrab) {
                desk[indexInDesk].grabLevel++;
                if (desk[indexInDesk].grabLevel >= 2) {
                    grabSuccess(desk, indexInDesk);
                }
            } else {
                desk[indexInDesk].grabLevel = -1;
                next = (indexInDesk + 2) % 3;
                var nextL = desk[next];
                if (nextL.grabLevel === -1) {
                    next = (indexInDesk + 1) % 3;
                    nextL = desk[next];
                    if (nextL.grabLevel === -1) {
                        start()
                    } else {
                        grabSuccess(desk, next);
                    }
                } else {
                    grabSuccess(desk, next);
                }
            }
        }

        // console.log(desk);
    })


    function grabSuccess(desk, index) {
        var landCards = desk[index]['porkers'].concat(desk.landlordCards);
        desk[index]['porkers'] = landCards;
        desk.landlord = index;
        if (index === indexInDesk) {
            socket.emit('start-play-' + desk[index].user, [checkStatus(indexInDesk, index), desk.landlordCards, landCards], time);
            for (var i = 0; i < 3; i++) {
                if (i !== index) {
                    socket.broadcast.emit('start-play-' + desk[i].user, [checkStatus(i, index), desk.landlordCards], time);
                }
            }
        } else {
            socket.broadcast.emit('start-play-' + desk[index].user, [checkStatus(index, index), desk.landlordCards, landCards], time);
            for (var i = 0; i < 3; i++) {
                if (i !== index) {
                    if (i === indexInDesk) {
                        socket.emit('start-play-' + desk[i].user, [checkStatus(i, index), desk.landlordCards], time);
                    } else {
                        socket.broadcast.emit('start-play-' + desk[i].user, [checkStatus(i, index), desk.landlordCards], time);
                    }
                }
            }
        }

    }

    function checkStatus(current, land) {
        var distance = Math.abs(current - land),
            status;

        /*
         * status:1 地主
         *       :2 搭档
         *       :3 农民
         * */

        switch (distance) {
            case 0://地主
                status = 1;
                break;
            case 1:
                if (current < land) {
                    status = 2;
                } else {
                    status = 3;
                }
                break;
            case 2:
                if (current < land) {
                    status = 3;
                } else {
                    status = 2;
                }
                break;
        }
        return status;
    }

    socket.on('save-status',function(status){
        identity = status;
    })

    socket.on('throw-card', function (cardIds, cardsChoose, complyRules, myPorkers) {
        var desk = desks[indexOfDesk],
            prevIndex = indexInDesk === 0 ? 2 : indexInDesk - 1 ,
            nextIndex = (indexInDesk + 1) % 3;

        //剩下的牌
        if(cardIds){
            desk[indexInDesk].porkers = myPorkers;
            if(myPorkers.length === 0){
                socket.emit('game-over-' + session.user,1);
                if(identity === 1){
                    socket.broadcast.emit('game-over-' + desk[nextIndex].user,0);
                    socket.broadcast.emit('game-over-' + desk[prevIndex].user,0);
                }else if(identity === 2){
                    socket.broadcast.emit('game-over-' + desk[nextIndex].user,0);
                    socket.broadcast.emit('game-over-' + desk[prevIndex].user,1);
                }else{
                    socket.broadcast.emit('game-over-' + desk[nextIndex].user,1);
                    socket.broadcast.emit('game-over-' + desk[prevIndex].user,0);
                }

            }
        }
       // console.log(cardIds);
        socket.emit('after-throw',time,cardIds);
        //触发下一家出牌
        socket.broadcast.emit('throwing-' + desk[nextIndex].user,time,cardIds,cardsChoose,complyRules);
        //触发上家等待
        socket.broadcast.emit('waiting-for-throwing-' + desk[prevIndex].user,time,cardIds,cardsChoose,complyRules);

    });

    //断开事件
    socket.on('disconnect', function () {
        var userDesk = userList[session.user],
            desk = desks[userDesk.desk];
        delete desk[userDesk.index];
        delete userList[session.user];
        for (var i = 0; i < 3; i++) {
            if (desk[i]) {
                desk[i].grabLevel = undefined;
                delete desk[i].porkers;
                socket.broadcast.emit('somebody-run-away-' + desk[i].user, session.user);
            }
        }
        delete desk.landlordCards;

    })
}