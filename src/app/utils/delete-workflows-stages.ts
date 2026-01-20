/**
 * Utility script to delete specific workflows and stages
 * سكريبت لحذف workflows و stages محددة
 * 
 * Usage:
 * يمكن استيراد واستخدام هذا السكريبت في component أو service
 * 
 * Example:
 * import { deleteSpecificWorkflowsAndStages } from './utils/delete-workflows-stages';
 * deleteSpecificWorkflowsAndStages(approvalWorkflowService, approvalStageService).subscribe(...);
 */

import { Observable, forkJoin, of, throwError } from 'rxjs';
import { map, switchMap, catchError, tap } from 'rxjs/operators';
import { ApprovalWorkflowService, ApprovalWorkflowDto } from '../views/FormBuilder/services/approval-workflow.service';
import { ApprovalStageService, ApprovalStageDto } from '../views/FormBuilder/services/approval-stage.service';

/**
 * Delete specific workflows and stages
 * حذف workflows و stages محددة
 */
export function deleteSpecificWorkflowsAndStages(
  approvalWorkflowService: ApprovalWorkflowService,
  approvalStageService: ApprovalStageService
): Observable<{ deletedWorkflows: string[], deletedStages: string[], errors: string[] }> {
  
  const workflowsToDelete = ['Approval', 'Default Workflow'];
  const stagesToDelete = ['stage1', 'المرحلة الأولى'];
  
  const deletedWorkflows: string[] = [];
  const deletedStages: string[] = [];
  const errors: string[] = [];

  console.log('[DeleteScript] Starting deletion process...');
  console.log('[DeleteScript] Workflows to delete:', workflowsToDelete);
  console.log('[DeleteScript] Stages to delete:', stagesToDelete);

  // Step 1: Get all workflows
  return approvalWorkflowService.getAllApprovalWorkflows().pipe(
    switchMap((workflows: ApprovalWorkflowDto[]) => {
      console.log('[DeleteScript] Found workflows:', workflows.map(w => ({ id: w.id, name: w.name, isDeleted: w.isDeleted })));
      
      // Find workflows to delete
      const workflowsToDeleteList = workflows.filter(w => 
        workflowsToDelete.includes(w.name) && !w.isDeleted
      );
      
      console.log('[DeleteScript] Workflows to delete:', workflowsToDeleteList.map(w => ({ id: w.id, name: w.name })));

      // Delete workflows
      const deleteWorkflowObservables = workflowsToDeleteList.map(workflow => 
        approvalWorkflowService.softDelete(workflow.id).pipe(
          tap(() => {
            console.log(`[DeleteScript] ✅ Deleted workflow: ${workflow.name} (ID: ${workflow.id})`);
            deletedWorkflows.push(workflow.name);
          }),
          catchError((error) => {
            const errorMsg = `Failed to delete workflow "${workflow.name}": ${error?.message || error}`;
            console.error(`[DeleteScript] ❌ ${errorMsg}`);
            errors.push(errorMsg);
            return of(null);
          })
        )
      );

      // Step 2: Get all stages for each workflow
      const getAllStagesObservables = workflows.map(workflow =>
        approvalStageService.getAllByWorkflowId(workflow.id).pipe(
          map((stages: ApprovalStageDto[]) => ({ workflow, stages })),
          catchError((error) => {
            console.warn(`[DeleteScript] Could not load stages for workflow ${workflow.id}:`, error);
            return of({ workflow, stages: [] });
          })
        )
      );

      // First delete workflows, then get stages
      const workflowDeleteObservable = deleteWorkflowObservables.length > 0
        ? forkJoin(deleteWorkflowObservables).pipe(catchError(() => of([])))
        : of([]);

      return workflowDeleteObservable.pipe(
        switchMap(() => {
          // After workflows are deleted, get all stages from all workflows
          const getAllStagesObservables = workflows.map(workflow =>
            approvalStageService.getAllByWorkflowId(workflow.id).pipe(
              map((stages: ApprovalStageDto[]) => stages),
              catchError(() => of([] as ApprovalStageDto[]))
            )
          );

          if (getAllStagesObservables.length === 0) {
            return of({ deletedWorkflows, deletedStages, errors });
          }

          return forkJoin(getAllStagesObservables).pipe(
            switchMap((stageArrays: ApprovalStageDto[][]) => {
              // Flatten all stages arrays
              const allStages: ApprovalStageDto[] = [];
              stageArrays.forEach(stageArray => {
                allStages.push(...stageArray);
              });

              console.log('[DeleteScript] Found stages:', allStages.map(s => ({ id: s.id, name: s.stageName, workflowId: s.workflowId, isDeleted: s.isDeleted })));

              // Find stages to delete
              const stagesToDeleteList = allStages.filter(s => 
                stagesToDelete.includes(s.stageName) && !s.isDeleted
              );

              console.log('[DeleteScript] Stages to delete:', stagesToDeleteList.map(s => ({ id: s.id, name: s.stageName, workflowId: s.workflowId })));

              // Delete stages
              const deleteStageObservables = stagesToDeleteList.map(stage =>
                approvalStageService.softDelete(stage.id!).pipe(
                  tap(() => {
                    console.log(`[DeleteScript] ✅ Deleted stage: ${stage.stageName} (ID: ${stage.id}, Workflow ID: ${stage.workflowId})`);
                    deletedStages.push(stage.stageName);
                  }),
                  catchError((error) => {
                    const errorMsg = `Failed to delete stage "${stage.stageName}": ${error?.message || error}`;
                    console.error(`[DeleteScript] ❌ ${errorMsg}`);
                    errors.push(errorMsg);
                    return of(null);
                  })
                )
              );

              if (deleteStageObservables.length === 0) {
                return of({ deletedWorkflows, deletedStages, errors });
              }

              return forkJoin(deleteStageObservables).pipe(
                map(() => ({ deletedWorkflows, deletedStages, errors }))
              );
            })
          );
        })
      );
    }),
    catchError((error) => {
      const errorMsg = `Failed to load workflows: ${error?.message || error}`;
      console.error(`[DeleteScript] ❌ ${errorMsg}`);
      errors.push(errorMsg);
      return of({ deletedWorkflows, deletedStages, errors });
    })
  );
}

/**
 * Delete workflows and stages by exact name match
 * حذف workflows و stages بالاسم المطابق تماماً
 */
export function deleteWorkflowsAndStagesByName(
  approvalWorkflowService: ApprovalWorkflowService,
  approvalStageService: ApprovalStageService,
  workflowNames: string[],
  stageNames: string[]
): Observable<{ deletedWorkflows: string[], deletedStages: string[], errors: string[] }> {
  
  const deletedWorkflows: string[] = [];
  const deletedStages: string[] = [];
  const errors: string[] = [];

  console.log('[DeleteScript] Starting deletion by name...');
  console.log('[DeleteScript] Workflow names:', workflowNames);
  console.log('[DeleteScript] Stage names:', stageNames);

  // Get all workflows
  return approvalWorkflowService.getAllApprovalWorkflows().pipe(
    switchMap((workflows: ApprovalWorkflowDto[]) => {
      // Find workflows by name
      const workflowsToDelete = workflows.filter(w => 
        workflowNames.includes(w.name) && !w.isDeleted
      );

      // Delete workflows
      const deleteWorkflowObservables = workflowsToDelete.map(workflow =>
        approvalWorkflowService.softDelete(workflow.id).pipe(
          tap(() => {
            console.log(`[DeleteScript] ✅ Deleted workflow: ${workflow.name} (ID: ${workflow.id})`);
            deletedWorkflows.push(workflow.name);
          }),
          catchError((error) => {
            const errorMsg = `Failed to delete workflow "${workflow.name}": ${error?.message || error}`;
            console.error(`[DeleteScript] ❌ ${errorMsg}`);
            errors.push(errorMsg);
            return of(null);
          })
        )
      );

      // First delete workflows, then get stages
      const workflowDeleteObservable = deleteWorkflowObservables.length > 0
        ? forkJoin(deleteWorkflowObservables).pipe(catchError(() => of([])))
        : of([]);

      return workflowDeleteObservable.pipe(
        switchMap(() => {
          // After workflows are deleted, get all stages from all workflows
          const getAllStagesObservables = workflows.map(workflow =>
            approvalStageService.getAllByWorkflowId(workflow.id).pipe(
              map((stages: ApprovalStageDto[]) => stages),
              catchError(() => of([] as ApprovalStageDto[]))
            )
          );

          if (getAllStagesObservables.length === 0) {
            return of({ deletedWorkflows, deletedStages, errors });
          }

          return forkJoin(getAllStagesObservables).pipe(
            switchMap((stageArrays: ApprovalStageDto[][]) => {
              // Flatten all stages arrays
              const allStages: ApprovalStageDto[] = [];
              stageArrays.forEach(stageArray => {
                allStages.push(...stageArray);
              });

              // Find stages by name
              const stagesToDelete = allStages.filter(s => 
                stageNames.includes(s.stageName) && !s.isDeleted
              );

              // Delete stages
              const deleteStageObservables = stagesToDelete.map(stage =>
                approvalStageService.softDelete(stage.id!).pipe(
                  tap(() => {
                    console.log(`[DeleteScript] ✅ Deleted stage: ${stage.stageName} (ID: ${stage.id})`);
                    deletedStages.push(stage.stageName);
                  }),
                  catchError((error) => {
                    const errorMsg = `Failed to delete stage "${stage.stageName}": ${error?.message || error}`;
                    console.error(`[DeleteScript] ❌ ${errorMsg}`);
                    errors.push(errorMsg);
                    return of(null);
                  })
                )
              );

              if (deleteStageObservables.length === 0) {
                return of({ deletedWorkflows, deletedStages, errors });
              }

              return forkJoin(deleteStageObservables).pipe(
                map(() => ({ deletedWorkflows, deletedStages, errors }))
              );
            })
          );
        })
      );
    }),
    catchError((error) => {
      const errorMsg = `Failed to load workflows: ${error?.message || error}`;
      console.error(`[DeleteScript] ❌ ${errorMsg}`);
      errors.push(errorMsg);
      return of({ deletedWorkflows, deletedStages, errors });
    })
  );
}

