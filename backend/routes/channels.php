<?php

use Illuminate\Support\Facades\Broadcast;
use App\Models\Room;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('room.{roomId}', function ($user, $roomId) {
    // В рамках хакатона разрешаем доступ всем авторизованным пользователям
    return [
        'id' => $user->id,
        'name' => $user->name ?? 'User ' . $user->id,
    ];
});
