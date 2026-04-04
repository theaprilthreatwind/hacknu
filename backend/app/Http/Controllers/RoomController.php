<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreRoomRequest;
use App\Http\Requests\UpdateRoomRequest;
use App\Http\Resources\RoomResource;
use App\Models\Project;
use App\Models\Room;
use Firebase\JWT\JWT;
use Illuminate\Http\Request;

class RoomController extends Controller
{
    public function index(Request $request)
    {
        $rooms = Room::whereHas('project', function ($query) use ($request) {
            $query->where('user_id', $request->user()->id);
        })->get();

        return RoomResource::collection($rooms);
    }

    public function store(StoreRoomRequest $request)
    {
        $project = Project::findOrFail($request->project_id);

        if ($project->user_id !== $request->user()->id) {
            abort(403, 'Unauthorized action.');
        }

        $room = Room::create($request->validated());
        return new RoomResource($room);
    }

    public function show(Request $request, Room $room)
    {
        // if ($room->project->user_id !== $request->user()->id) {
        //     abort(403, 'Unauthorized action.');
        // }

        return new RoomResource($room);
    }

    public function update(UpdateRoomRequest $request, Room $room)
    {
        // if ($room->project->user_id !== $request->user()->id) {
        //     abort(403, 'Unauthorized action.');
        // }

        $room->update($request->validated());
        return new RoomResource($room);
    }

    public function saveCanvas(Request $request, Room $room)
    {
        // if ($room->project->user_id !== $request->user()->id) {
        //     abort(403, 'Unauthorized action.');
        // }

        $validated = $request->validate([
            'canvas_state' => 'nullable|array',
        ]);

        $room->update([
            'canvas_state' => $validated['canvas_state']
        ]);

        return response()->json(['message' => 'Canvas state saved successfully'], 200);
    }

    public function destroy(Request $request, Room $room)
    {
        // if ($room->project->user_id !== $request->user()->id) {
        //     abort(403, 'Unauthorized action.');
        // }

        $room->delete();
        return response()->noContent();
    }

    public function generateVideoToken(Request $request, Room $room)
    {
        // if ($room->project->user_id !== $request->user()->id) {
        //     abort(403, 'Unauthorized action.');
        // }

        $payload = [
            'iss' => env('LIVEKIT_API_KEY'),
            'nbf' => time(),
            'exp' => time() + 7200,
            'sub' => (string) $request->user()->id,
            'video' => [
                'roomJoin' => true,
                'room' => (string) $room->id,
            ],
            'name' => $request->user()->name,
        ];

        $token = JWT::encode($payload, env('LIVEKIT_API_SECRET'), 'HS256');

        return response()->json([
            'token' => $token,
            'livekit_url' => env('LIVEKIT_URL'),
        ]);
    }

    public function joinByUuid(Request $request, $uuid)
    {
        $room = Room::where('share_uuid', $uuid)->firstOrFail();
        return response()->json(['data' => $room]);
    }
}
