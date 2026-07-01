import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';

// Ensures non-superadmin users have a tenantId
@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest();
    if (user?.role === Role.SUPERADMIN) return true;
    if (!user?.tenantId) {
      throw new ForbiddenException('Usuario sin tenant asignado');
    }
    return true;
  }
}
