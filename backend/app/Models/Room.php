<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Room extends Model
{
    use HasFactory;

    protected $fillable = [
        'project_id',
        'name',
        'status',
        'started_at',
        'ended_at',
        'canvas_state',
        'share_uuid',
    ];

    protected static function booted(): void
    {
        static::creating(function (Room $room) {
            $room->share_uuid = (string) \Illuminate\Support\Str::uuid();
        });
    }

    protected function casts(): array
    {
        return [
            'started_at' => 'datetime',
            'ended_at' => 'datetime',
            'canvas_state' => 'array',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }
}
