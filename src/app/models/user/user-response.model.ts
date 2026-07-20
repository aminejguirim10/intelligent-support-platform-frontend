import { Role } from '../enums/role.enum';

export interface UserResponse {
  id: number;
  name: string;
  email: string;
  phoneNumber: string;
  profilePhotoUrl: string;
  role: Role;
  createdAt: string;
}
