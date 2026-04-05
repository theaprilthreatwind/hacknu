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

    public function show(Request $request, $uuidOrId)
    {
        $query = Room::query();
        if (is_numeric($uuidOrId)) {
            $query->where('id', $uuidOrId);
        } else {
            $query->where('share_uuid', $uuidOrId);
        }
        $room = $query->firstOrFail();

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

    public function saveCanvas(Request $request, $uuidOrId)
    {
        $query = Room::query();
        if (is_numeric($uuidOrId)) {
            $query->where('id', $uuidOrId);
        } else {
            $query->where('share_uuid', $uuidOrId);
        }
        $room = $query->firstOrFail();

        $validated = $request->validate([
            'canvas_state' => 'nullable|array',
        ]);

        $room->update([
            'canvas_state' => $validated['canvas_state']
        ]);

        return response()->json(['message' => 'Canvas state saved successfully', 'ok' => true], 200);
    }

    public function destroy(Request $request, Room $room)
    {
        // if ($room->project->user_id !== $request->user()->id) {
        //     abort(403, 'Unauthorized action.');
        // }

        $room->delete();
        return response()->noContent();
    }

    public function generateVideoToken(Request $request, $uuidOrId)
    {
        try {
            $query = Room::query();
            if (is_numeric($uuidOrId)) {
                $query->where('id', $uuidOrId);
            } else {
                $query->where('share_uuid', $uuidOrId);
            }
            $room = $query->firstOrFail();

            // Participant identity: user name or unique guest ID
            $identity = $request->user() 
                ? (string) $request->user()->id 
                : 'guest_' . bin2hex(random_bytes(4));

            $name = $request->user() 
                ? $request->user()->name 
                : 'Guest ' . rand(100, 999);

            $payload = [
                'iss' => env('LIVEKIT_API_KEY'),
                'sub' => $identity,
                'nbf' => time(),
                'exp' => time() + 7200,
                'video' => [
                    'roomJoin' => true,
                    'room'     => $room->share_uuid ?? (string) $room->id,
                ],
                'name' => $name,
            ];

            $token = JWT::encode($payload, env('LIVEKIT_API_SECRET'), 'HS256');

            return response()->json([
                'token'       => $token,
                'livekit_url' => env('LIVEKIT_URL'),
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'error'   => 'Failed to generate video token',
                'message' => $e->getMessage(),
                'trace'   => $e->getTraceAsString(),
            ], 500);
        }
    }

    public function joinByUuid(Request $request, $uuid)
    {
        $room = Room::where('share_uuid', $uuid)->firstOrFail();
        return response()->json(['data' => $room]);
    }
}
