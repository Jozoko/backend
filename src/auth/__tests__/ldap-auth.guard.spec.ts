import { Test, TestingModule } from '@nestjs/testing';
import { LdapAuthGuard } from '../guards/ldap-auth.guard';
import { AuthGuard } from '@nestjs/passport';

describe('LdapAuthGuard', () => {
  let guard: LdapAuthGuard;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LdapAuthGuard],
    }).compile();

    guard = module.get<LdapAuthGuard>(LdapAuthGuard);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should extend AuthGuard with ldap strategy', () => {
    expect(guard).toBeInstanceOf(AuthGuard('ldap'));
  });
}); 