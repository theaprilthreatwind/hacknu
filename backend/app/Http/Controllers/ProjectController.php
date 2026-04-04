<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreProjectRequest;
use App\Http\Requests\UpdateProjectRequest;
use App\Http\Resources\ProjectResource;
use App\Models\Project;
use Illuminate\Http\Request;

class ProjectController extends Controller
{
    public function index(Request $request)
    {
        $projects = $request->user()->projects;
        return ProjectResource::collection($projects);
    }

    public function store(StoreProjectRequest $request)
    {
        $project = $request->user()->projects()->create($request->validated());
        return new ProjectResource($project);
    }

    public function show(Request $request, Project $project)
    {
        if ($project->user_id !== $request->user()->id) {
            abort(403, 'Unauthorized action.');
        }

        $project->load('rooms');
        return new ProjectResource($project);
    }

    public function update(UpdateProjectRequest $request, Project $project)
    {
        if ($project->user_id !== $request->user()->id) {
            abort(403, 'Unauthorized action.');
        }

        $project->update($request->validated());
        return new ProjectResource($project);
    }

    public function destroy(Request $request, Project $project)
    {
        if ($project->user_id !== $request->user()->id) {
            abort(403, 'Unauthorized action.');
        }

        $project->delete();
        return response()->noContent();
    }
}
