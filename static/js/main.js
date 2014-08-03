/**
 * Created by Administrator on 14-3-16.
 */
(function(){
    //规则1-13 红桃
//14-26 梅花
//27-39 黑桃
//40-52 方块
//53 54 小鬼 大鬼
    var socket = io.connect('http://web-landlords.ap01.aws.af.cm/');

    window.socket = socket;

    var color = ['hearts', 'plum-flower', 'spades', 'square-piece'],
        myPorkers,
        userCards = {},
        prevCardsSend = [],
        identity,
        waitInter,
        grabInter,
        throwInter,
        otherThrowInter;

    var thumb_img = {
        landlord:'/img/land1.png',
        framer:'/img/land2.png',
        partner:'/img/land3.png'
    }

    //上家的牌
    var prevCrads = null ,
        mustThrow = 0;

    var cardsChoose = [],
        cardIds = [];

    socket.on('room-in', function (username) {

        socket.on('init-poker-' + username, function (userPorker) {
            $('#waiting_msg').hide();
            myPorkers = userPorker;
            userCards = analysisUserPorker(userPorker);
            renderUI();
        });

        socket.on('start-grab-landlord-' + username, function (time) {
            showGrab(time, username);
        });

        socket.on('wait-for-grab-' + username, function (relative) {
            var current = relative[0],
                standard = relative[1],
                distance = Math.abs(current - standard),
                time = relative[2];

            if (current < standard) {
                if (distance === 1) {
                    //右边抢地主
                    showOthersGrab(time, 'next');
                } else {
                    //左边抢地主
                    showOthersGrab(time, 'prev');
                }
            } else {
                if (distance === 1) {
                    //左边抢地主
                    showOthersGrab(time, 'prev');
                } else {
                    //右边抢地主
                    showOthersGrab(time, 'next');
                }
            }
        });

        socket.on('start-play-' + username,function(relative,time){
            var status = relative[0],
                name = '',
                thumb = $('#thumb'),
                img = thumb.find('img'),
                thumb_right = $('#thumb_right'),
                thumb_right_img = thumb_right.find('img'),
                thumb_left = $('#thumb_left'),
                thumb_left_img = thumb_left.find('img'),
                landlordCards = relative[1],
                allCards = relative[2];


            clearInterval(waitInter);
            $('#other_grab').hide();
            thumb.show();
            thumb_right.show();
            thumb_left.show();



            switch(status){
                case 1://地主
                    img.attr('src',thumb_img.landlord);
                    thumb_right_img.attr('src',thumb_img.framer);
                    thumb_left_img.attr('src',thumb_img.partner);
                    userCards = {};
                    myPorkers = allCards;
                    userCards = analysisUserPorker(allCards);
                    renderMyUI($('#user_cards'),userCards);
                    showThrow(time);
                    cardsChoose.length = 0;
                    cardIds.length = 0;
                    name = '地主';
                    break;
                case 2://搭档
                    img.attr('src',thumb_img.partner);
                    thumb_right_img.attr('src',thumb_img.landlord);
                    renderPreNext(20,$('#right'));
                    thumb_left_img.attr('src',thumb_img.framer);
                    showOtherThrow(time,'next');
                    name = '搭档';
                    break;
                case 3://农民
                    img.attr('src',thumb_img.framer);
                    thumb_right_img.attr('src',thumb_img.partner);
                    thumb_left_img.attr('src',thumb_img.landlord);
                    renderPreNext(20,$('#left'));
                    showOtherThrow(time,'prev');
                    name = '农民';
                    break;
            }

            //出完牌需要把身份发给服务器端
            socket.emit('save-status',status);
            identity = name;

            var landlordCardsColor = analysisUserPorker(landlordCards);
            var top = $('#top'),
                left = 0;
            top.html('');
            for (var i = 17; i > 2; i--) {
                if (landlordCardsColor[i]) {
                    for (var j = 0; j < landlordCardsColor[i].length; j++) {
                        imgObj = $('<img src="/img/pokers/' + landlordCardsColor[i][j].card + '.jpg"/>');
                        imgObj.css({
                            left: left+'px'
                        });
                        top.append(imgObj);
                        left+=150;
                    }
                }
            }
        });

        //胜利事件
        socket.on('game-over-' + username,function(isVictory){

            var slogan = '';
            if(isVictory === 1){
                slogan = '胜利了！'
            }else{
                slogan = '失败了！'
            }

            alert(identity + ':' + slogan);

        })

        //我出完牌
        socket.on('after-throw',function(time,cardIds){

            var cardsThrowedContent = $('#cards_throwed_content')
            $('#cards_next_throwed_content').hide();
            showOtherThrow(time,'next');
            $('#throw').hide();
            clearInterval(throwInter);
            cardsThrowedContent.show();
            if(cardIds){
                userCards = analysisUserPorker(myPorkers);
                renderMyUI($('#user_cards'),userCards);

                var cardsThrowed = analysisUserPorker(cardIds);
                renderMyUI(cardsThrowedContent,cardsThrowed);

                prevCrads = null;
                mustThrow = 0;
                cardsChoose.length = 0;

            }else{

                cardsThrowedContent.css({
                    left:($(window).width() - cardsThrowedContent.width())/2 + 'px'
                })
                cardsThrowedContent.html('<strong class="notice">不出</strong>');
            }

        });

        //上家出完牌
        socket.on('throwing-' + username,function(time,cardIds,cardsChoose,complyRules){
            var other_grab = $('#other_grab'),
                prevContent = $('#cards_prev_throwed_content');
            $('#cards_throwed_content').hide();
            showThrow(time);
            clearInterval(otherThrowInter);
            other_grab.hide();
            prevContent.show();
            if(cardIds){
                showCardsPrev(cardIds);
                mustThrow = 0;
            }else{
                mustThrow++;
                prevContent.html('<strong class="notice-left">不出</strong>');
            }

            if(complyRules){
                prevCrads = complyRules;
            }

        });

        //下家出完牌
        socket.on('waiting-for-throwing-' + username,function(time,cardIds,cardsChoose,complyRules){
            var nextContent = $('#cards_next_throwed_content');
            clearInterval(otherThrowInter);
            showOtherThrow(time,'prev');
            nextContent.show();
            if(cardIds){
                showCardsNext(cardIds);
                mustThrow = 0;
            }else{
                mustThrow++;
                nextContent.html('<strong class="notice-right">不出</strong>');
            }

            $('#cards_prev_throwed_content').html('').hide();
            prevCrads = complyRules;
        });

        //别人逃跑
        socket.on('somebody-run-away-' + username,function(runawayUser){
            // alert(runawayUser + '逃跑了,系统将补偿你10000000000000亿美金！！！');
            initBack();
        });
    })


    $('#enter_in a').on('click',function(){
        $('#enter_in').hide();

    })


//renderUI
    function renderUI() {
        var user_cards = $('#user_cards'),
            preUser = $('#left'),
            nextUser = $('#right'),
            top = $('#top'),
            imgObj,
            size = 0;

        user_cards.html('');
        preUser.html('');
        nextUser.html('');
        top.html('')

        renderMyUI(user_cards,userCards);

        renderPreNext(17, preUser, nextUser);

        for (var i = 0; i < 3; i++) {
            imgObj = $('<img src="/img/pokers/back.jpg"/>');
            imgObj.css({
                top: 0,
                left: (100 + 50) * i
            })
            top.append(imgObj);
        }
    }

//渲染我的牌
    function renderMyUI(content,userCards,noLocation) {
        var imgObj,
            size = 0,
            allImgSize = 0;

        content.html('');
        for (var i = 17; i > 2; i--) {
            if (userCards[i]) {
                for (var j = 0; j < userCards[i].length; j++) {
                    imgObj = $('<img class="card" data-id="'+ userCards[i][j].id +'" data-card="'+ userCards[i][j].card +'" src="/img/pokers/' + userCards[i][j].card + '.jpg"/>');
                    imgObj.css({
                        left: size,
                        top: 10
                    })
                    content.append(imgObj);
                    size += 30;
                    allImgSize++;
                }
            }
        }

        var width = 100 + (allImgSize - 1) * 30;

        content.css({
            width: width
        })

        if(!noLocation){
            var left = ($(window).width() - width) / 2;
            content.css({
                left: left
            })
        }
    }

//渲染上下家牌
    function renderPreNext(pokersSize) {
        var size = 0,
            prev, next;

        if (arguments.length > 2) {
            prev = arguments[1];
            next = arguments[2];
        } else if (arguments.length === 2) {
            prev = arguments[1];
        }

        for (var i = 0; i < pokersSize; i++) {
            imgObj = $('<img src="/img/pokers/back.jpg"/>');
            imgObj.css({
                top: size
            })
            prev.append(imgObj);

            if (next) {
                imgObj = $('<img src="/img/pokers/back.jpg"/>');
                imgObj.css({
                    top: size
                })
                next.append(imgObj);
            }
            size += 10;
        }

    }

//分析扑克，解析花色
    function analysisUserPorker(userPorker) {
        var currentCard,
            currentColor,
            colorNum,
            userColorInex;

        var userCards = {};
        for (var i = 0; i < userPorker.length; i++) {
            currentCard = userPorker[i];
            if (currentCard === 54) {
                userCards[17] = [{
                    id:54,
                    card:'big-joker'
                }]
            } else if (currentCard === 53) {
                userCards[16] = [{
                    id:53,
                    card:'small-joker'
                }]
            } else {
                currentColor = color[Math.floor((currentCard - 0.1) / 13)];
                //currentColor
                colorNum = currentCard % 13;
                if (colorNum === 2) {
                    userColorInex = 15;
                } else if (colorNum === 1) {
                    userColorInex = 14;
                } else if (colorNum === 0) {
                    userColorInex = 13;
                    colorNum = 13;
                } else {
                    userColorInex = colorNum;
                }
                if (!userCards[userColorInex]) {
                    userCards[userColorInex] = [];
                }
                userCards[userColorInex].push({
                    id:currentCard,
                    card:currentColor + '-' + colorNum
                })
            }
        }

        return userCards;
    }

//显示抢地主
    function showGrab(time, username) {
        var start_grab = $('#grab_content'),
            timeContent = $('#time_left'),
            other_grab = $('#other_grab'),
            width;

        other_grab.hide();
        start_grab.show();
        clearInterval(waitInter);
        clearInterval(grabInter);

        width = start_grab.width();

        start_grab.css({
            left: ($(window).width() - width) / 2
        });

        timeContent.html(time);
        grabInter = setInterval(function () {
            time--;
            //时间到，不抢了
            if (time <= 0) {
                clearInterval(grabInter);
                start_grab.hide();
                socket.emit('grab', false);
            }
            timeContent.html(time)
        }, 1000);
    }

//显示他人抢地主
    function showOthersGrab(time, location) {
        var other_grab = $('#other_grab'),
            grab_content = $('#grab_content');


        if (location == 'prev') {
            other_grab.css({
                'left': '200px',
                'right': 'auto'
            })
        } else if (location == 'next') {
            other_grab.css({
                'right': '200px',
                'left': 'auto'
            })
        }

        grab_content.hide();
        clearInterval(grabInter);
        clearInterval(waitInter);
        other_grab.show();
        other_grab.html(time).css('display', 'block');

        waitInter = setInterval(function () {
            time--;
            if (time <= 0) {
                clearInterval(waitInter);
                other_grab.hide();
                return;
            }
            other_grab.html(time);
        }, 1000);
    }

//显示出牌
    function showThrow(time){
        var $throw = $('#throw'),
            timeContent = $('#throw_time_left');

        $throw.show();

        var width = $throw.width();

        $throw.css({
            left: ($(window).width() - width) / 2
        });
        timeContent.html(time);
        throwInter = setInterval(function () {
            time--;
            //时间到，不出牌
            if (time <= 0) {
                clearInterval(throwInter);
                if(mustThrow === 2){
                    alert('您必须出牌！！');
                    return;
                }
                $throw.hide();
                socket.emit('throw-card', false);
            }
            timeContent.html(time);
        }, 1000);

    }

//显示别人出牌
    function showOtherThrow(time,location){
        var other_grab = $('#other_grab');

        if (location == 'prev') {
            other_grab.css({
                'left': '200px',
                'right': 'auto'
            })
        } else if (location == 'next') {
            other_grab.css({
                'right': '200px',
                'left': 'auto'
            })
        }

        other_grab.html(time).css('display', 'block');
        otherThrowInter = setInterval(function () {
            time--;
            if (time <= 0) {
                clearInterval(otherThrowInter);
                other_grab.hide();
                return;
            }
            other_grab.html(time);
        }, 1000);
    }

    //显示上家出的牌
    function showCardsPrev(cardIds){
        var cards_prev_throwed_content = $('#cards_prev_throwed_content');
        cards_prev_throwed_content.html('');
        var _prevCrads = analysisUserPorker(cardIds);
        renderMyUI(cards_prev_throwed_content,_prevCrads,true);
        cards_prev_throwed_content.show();
    }

    //显示下家出的牌
    function showCardsNext(cardIds){
        var cards_next_throwed_content = $('#cards_next_throwed_content');
        cards_next_throwed_content.html('');
        var _nextCrads = analysisUserPorker(cardIds);
        renderMyUI(cards_next_throwed_content,_nextCrads,true);
        cards_next_throwed_content.show();
    }

    function initBack(){
        clearInterval(waitInter);
        clearInterval(grabInter);
        clearInterval(throwInter);
        clearInterval(otherThrowInter);
        $('#left').html('');
        $('#user_cards').html('');
        $('#right').html('');
        $('#top').html('');
        $('#thumb_left').hide();
        $('#thumb_right').hide();
        $('#thumb').hide();
        $('#other_grab').html('');
        $('#throw').hide();
    }

//绑定事件
    var start_grab = $('#start_grab'),
        grab_content = $('#grab_content'),
        donot_grab = $('#donot_grab');

    start_grab.on('click', function () {
        clearInterval(grabInter);
        grab_content.hide();
        socket.emit('grab', true);
    })

    donot_grab.on('click', function () {
        clearInterval(grabInter);
        grab_content.hide();
        socket.emit('grab', false);
    })



    $(document).on('click','.card',function(){
        var $thisCard = $(this),
            id = $thisCard.data('id'),
            originCard = $thisCard.data('card'),
            reg = /[^\d]+-(\d+)/,
            choosed = $thisCard.data('choosed'),
            card,
            result;


        if(id != 54 && id != 53){
            result = reg.exec(originCard);
            if(result.length === 2){
                card = result[1];
            }
            if(card == 1){
                card = 14
            }
            if(card == 2){
                card = 16;
            }
        }else{
            card = id;
        }

        if(!choosed){
            $thisCard.animate({
                top:'-10px'
            },100);
            cardsChoose.push({
                id:id,
                card:card,
                originCard:originCard
            })
            $thisCard.data('choosed',true);
        }else{
            $thisCard.animate({
                top:'10px'
            },100)
            for(var i = 0;i<cardsChoose.length;i++){
                if(id === cardsChoose[i].id){
                    cardsChoose.splice(i,1);
                    break;
                }
            }
            $thisCard.data('choosed',false);
        }

        cardsChoose.sort(function(a,b){
            return b.card - a.card;
        });

        console.log(cardsChoose)

    });

    var $throw_out = $('#throw_out'),
        $donot_throw = $('#donot_throw');

//出牌需满足两个条件 出的牌符合规则 大于上家的牌
    $throw_out.on('click',function(){
        var complyRules = checkCardsRule();

        if(!complyRules){
            alert('您的牌不符合规则');
            return;
        }


        if(prevCrads){
            //上一家是王炸
            if(/wongFried/.test(prevCrads.name)){
                alert('你的牌没有大于上家');
                return;
            }

            if(/wongFried/.test(complyRules.name)){
                success();
            }else if(/bomb/.test(complyRules.name) && !/bomb/.test(prevCrads.name)){
                success();
            }else{
                var isBigger = rulesCompare[prevCrads.name](complyRules,prevCrads);
                if(isBigger){
                    success();
                }else{
                    alert('你的牌没有大于上家');
                }
            }

        }else{
            success()
        }

        function success(){
            getIds();
            difference(myPorkers,cardIds);
            socket.emit('throw-card',cardIds,cardsChoose,complyRules,myPorkers);
        }
    });

    $donot_throw.on('click',function(){
        if(mustThrow === 2){
            alert('您必需出牌！！！');
            return;
        }

        var $throw = $('#throw');
        clearInterval(throwInter);
        $throw.hide();

        socket.emit('throw-card', false);
    });

    //取得牌id集合
    function getIds(){
        cardIds.length = 0;
        for(var i = 0;i<cardsChoose.length;i++){
            cardIds.push(cardsChoose[i].id);
        }
    }

    function difference(content,children){
        var contentObj = {},
            childrenObj = {},
            newContent = [];

       // console.log(children);
        content.forEach(function(val){
            contentObj[val] = true;
        });

        children.forEach(function(val){
            childrenObj[val] = true;
        });

       // console.log(childrenObj)
        for(var i in childrenObj){
            delete contentObj[i];
        }

        content.length = 0;
        for(var i in contentObj){
            content.push(i*1);
        }
    }

    //出牌规则
    function checkCardsRule(){
        var result ;
        for(var rule in rules){
            result = rules[rule]();
            if(result){
                return result;
            }
        }
        return false;
    }

    var rules = {
        one:function(){
            var length = cardsChoose.length,
                card ,
                result = {};

            if(length === 1){
                card = cardsChoose[0].card;
                result.name = 'one';
                result.card = card;
                return result;
            }
            return false;
        },
        pairs:function(){
            var length = cardsChoose.length,
                result = {};
            if(length==2&&cardsChoose[0].card === cardsChoose[1].card){
                result.name = 'pairs';
                result.card = cardsChoose[0].card;
                return result;
            }
            return false;
        },
        three:function(){
            var length = cardsChoose.length,
                result = {};
            if(length == 3
                && cardsChoose[0].card === cardsChoose[1].card
                && cardsChoose[1].card === cardsChoose[2].card){
                result.name = 'three';
                result.card = cardsChoose[0].card;
                return result;
            }
            return false;
        },
        threeWithOne:function(){
            var length = cardsChoose.length,
                result = {};
            if(length == 4 ){
                if((cardsChoose[0].card === cardsChoose[1].card && cardsChoose[1].card === cardsChoose[2].card)
                    || (cardsChoose[1].card === cardsChoose[2].card && cardsChoose[2].card === cardsChoose[3].card)){
                    result.name = 'threeWithOne';
                    result.card = cardsChoose[1].card;
                    return result;
                }
            }
            return false;
        },
        threeWithPairs:function(){
            var length = cardsChoose.length,
                result = {};
            if(length == 5 ){
                if((cardsChoose[0].card === cardsChoose[1].card && cardsChoose[1].card === cardsChoose[2].card
                    && cardsChoose[3].card === cardsChoose[4].card)
                    || (cardsChoose[2].card === cardsChoose[3].card && cardsChoose[3].card === cardsChoose[4].card
                    && cardsChoose[0].card === cardsChoose[1].card)){
                    result.name = 'threeWithPairs';
                    result.card = cardsChoose[2].card;
                    return result;
                }
            }
            return false;
        },
        fourWithTwo:function(){
            var length = cardsChoose.length,
                result = {},
                uniques = {},
                card;
            if(length == 6 ){
                for(var i = 0;i<length;i++){
                    card = cardsChoose[i].card;
                    if(uniques[card]){
                        uniques[card] ++;
                        if(uniques[card] === 4){
                            result.name = 'fourWithTwo';
                            result.card = card;
                            return result;
                        }
                    }else{
                        uniques[card] = 1;
                    }
                };
            }

            return false;
        },
        fourWithPairs:function(){
            var length = cardsChoose.length,
                uniques = {},
                result = {},
                threeObj = {},
                fourCard,
                card;

            if(length == 8 ){
                for(var i = 0;i<length;i++){
                    card = cardsChoose[i].card;
                    if(uniques[card]){
                        uniques[card] ++;
                    }else{
                        uniques[card] = 1;
                    }
                };
            }

            for(var i in uniques){
                if(uniques[i] === 4){
                    fourCard = i;
                    threeObj[4] = true;
                }else if(uniques[i] === 2){
                    if(threeObj[2]){
                        threeObj[2]++;
                    }else{
                        threeObj[2] = 1;
                    }
                }
            }

            if(threeObj[4] && threeObj[2] === 2){
                result.name = 'fourWithPairs';
                result.card = fourCard;
                return result;
            }

            return false;
        },
        junko:function(){
            var length = cardsChoose.length,
                result = {},
                current ;
            if(length>=5){
                for(var i = 0;i<length;i++){
                    //有大小鬼返回false;
                    if(isNaN(cardsChoose[i].card)){
                        return false;
                    }
                    //有2返回false;
                    if(cardsChoose[i].card == 16){
                        return false;
                    }
                    if(!current){
                        current =  cardsChoose[i].card * 1 ;
                    }else{
                        if(current != cardsChoose[i].card * 1 + 1){
                            return false;
                        }
                        current = cardsChoose[i].card * 1 ;
                    }
                }
                result.name = 'junko';
                result.max = cardsChoose[0].card * 1;
                result.length = length;
                return result;
            }else{
                return false;
            }
        },
        company:function(){
            var length = cardsChoose.length,
                result = {};
            if(length >= 6 && length%2 === 0){
                for(var i = 0;i<length;i+=2){
                    if(cardsChoose[i].card != cardsChoose[i+1].card ){
                        return false;
                    }
                    if(i != length-2){
                        if(cardsChoose[i].card != cardsChoose[i+2].card*1+1){
                            return false;
                        }
                    }
                }
                result.name = 'company';
                result.length = length;
                result.max = cardsChoose[0].card * 1;

                return result;
            }
            return false;
        },
        aircraft:function(){
            var length = cardsChoose.length,
                result = {},
                card,
                threeObj = [],
                oneObj = [],
                twoObj = [],
                uniques = {};

            if( length>5 && (length%4 ===0 || length%5 ===0 || length%3 ===0) ){
                for(var i = 0;i<length;i++){
                    for(var i = 0;i<length;i++){
                        card = cardsChoose[i].card;
                        if(uniques[card]){
                            uniques[card] ++;
                        }else{
                            uniques[card] = 1;
                        }
                    };
                }

                for(var i in uniques){
                    switch(uniques[i]){
                        case 3:
                            threeObj.push(i);
                            break;
                        case 2:
                            twoObj.push(i);
                            break;
                        case 1:
                            oneObj.push(i);
                            break;
                    }
                }

                console.log(uniques);
                console.log(threeObj);
                console.log(twoObj);
                console.log(oneObj);

                var currentOneOfThree;

                if(threeObj.length>=2){

//                    if(twoObj.length && oneObj.length){
//                        return false;
//                    }
                    threeObj.sort(function(a,b){
                        return b*1 - a*1;
                    })
                    for(var i = 0;i<threeObj.length;i++){
                        if(!currentOneOfThree){
                            currentOneOfThree = threeObj[i]*1;
                        }else{
                            if( currentOneOfThree != threeObj[i]*1 + 1){
                                return false;
                            }
                            currentOneOfThree = threeObj[i]*1;
                        }
                    }

                    if(!twoObj.length && !oneObj.length){
                        result.name = 'aircraft';
                        result.max = threeObj[0] * 1;
                        result.length = length;
                        return result;
                    }

                    if(twoObj.length>0 && twoObj.length != threeObj.length){
                        return false;
                    }



                    if(length === threeObj.length*4){
                        result.name = 'aircraft';
                        result.max = threeObj[0] * 1;
                        result.length = length;
                        return result;
                    }

                    if(length === threeObj.length*5 && twoObj.length === threeObj.length ){
                        result.name = 'aircraft';
                        result.max = threeObj[0] * 1;
                        result.length = length;
                        return result;
                    }

                }

            }
            return false;
        },
        bomb:function(){
            var length = cardsChoose.length,
                result = {};
            if(length === 4){
                if(cardsChoose[0].card === cardsChoose[1].card
                    && cardsChoose[0].card === cardsChoose[2].card
                    && cardsChoose[0].card === cardsChoose[3].card){
                    result.name = 'bomb';
                    result.card = cardsChoose[0].card*1;
                    return result;
                }
            }
            return false;
        },
        wongFried:function(){
            var length = cardsChoose.length,
                result = {},
                reg = /53|54/;
            if(length === 2){
                if(reg.test(cardsChoose[0].card) && reg.test(cardsChoose[1].card)){
                    result.name = 'wongFried';
                    return result;
                }
            }
            return false;
        }


    }

    var rulesCompare = {
        one:function(current,prev){
            if(current.name === prev.name){
                if(current.card*1 > prev.card*1){
                    return true;
                }
            }
            return false;
        },
        pairs:function(current,prev){
            return this.one(current,prev);
        },
        three:function(current,prev){
            return this.one(current,prev);
        },
        threeWithOne:function(current,prev){
            return this.one(current,prev);
        },
        threeWithPairs:function(current,prev){
            return this.one(current,prev);
        },
        fourWithTwo:function(current,prev){
            return this.one(current,prev);
        },
        fourWithPairs:function(current,prev){
            return this.one(current,prev);
        },
        junko:function(current,prev){
            if(current.name === prev.name){
                if(current.length === prev.length){
                    if(current.max > prev.max){
                        return true;
                    }
                    return false;
                }
                return false;
            }
            return false;
        },
        company:function(current,prev){
            return this.junko(current,prev);
        },
        aircraft:function(current,prev){
            return this.junko(current,prev);
        },
        bomb:function(current,prev){
            return this.one(current,prev);
        }
    }

    window.onbeforeunload = function(){
        return '请不要离开！！！';
    }
})();