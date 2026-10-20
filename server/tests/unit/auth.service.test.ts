import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { register, login, refreshAccessToken } from '../../src/modules/auth/auth.service.js';
import { query } from '../../src/database/index.js';
import { AppError } from '../../src/middleware/errorHandler.js';
import { config } from '../../src/config/index.js';

vi.mock('../../src/database/index.js', () => ({
  query: vi.fn(),
  pool: { query: vi.fn() },
}));

describe('Auth Service - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('register()', () => {
    it('should register a new user successfully and return tokens and user details', async () => {
      const mockQuery = vi.mocked(query);

      // 1. Email existence check -> not found
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: '',
        oid: 0,
        fields: [],
      });

      // 2. Insert user query -> returns created user
      const mockCreatedUser = {
        id: '11111111-1111-1111-1111-111111111111',
        email: 'developer@example.com',
        role: 'developer',
        team_id: null,
      };
      mockQuery.mockResolvedValueOnce({
        rows: [mockCreatedUser],
        rowCount: 1,
        command: '',
        oid: 0,
        fields: [],
      });

      const result = await register({
        email: 'developer@example.com',
        password: 'Password123!',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user).toEqual({
        id: mockCreatedUser.id,
        email: mockCreatedUser.email,
        role: mockCreatedUser.role,
        teamId: mockCreatedUser.team_id,
      });

      // Verify token is a valid RS256 access token.
      const decoded = jwt.verify(result.accessToken, config.jwt.publicKey, { algorithms: ['RS256'] }) as any;
      expect(decoded.userId).toBe(mockCreatedUser.id);
      expect(decoded.email).toBe(mockCreatedUser.email);
      expect(decoded.tokenUse).toBe('access');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO refresh_sessions'),
        expect.any(Array),
      );
    });

    it('should throw AppError 409 if email already exists', async () => {
      const mockQuery = vi.mocked(query);
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'existing-id' }],
        rowCount: 1,
        command: '',
        oid: 0,
        fields: [],
      });

      await expect(
        register({ email: 'duplicate@example.com', password: 'Password123!' }),
      ).rejects.toMatchObject({
        statusCode: 409,
        code: 'EMAIL_EXISTS',
      });
    });

  });

  describe('login()', () => {
    it('should authenticate user and return tokens when credentials are valid', async () => {
      const mockQuery = vi.mocked(query);
      const hashedPassword = await bcrypt.hash('CorrectPass123!', 10);

      const mockUser = {
        id: 'user-uuid-1234',
        email: 'user@example.com',
        password_hash: hashedPassword,
        role: 'developer',
        team_id: 'team-uuid-5678',
      };

      // 1. User lookup by email
      mockQuery.mockResolvedValueOnce({
        rows: [mockUser],
        rowCount: 1,
        command: '',
        oid: 0,
        fields: [],
      });

      // 2. Update last_login_at
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
        command: '',
        oid: 0,
        fields: [],
      });
      mockQuery.mockResolvedValueOnce({
        rows: [], rowCount: 1, command: '', oid: 0, fields: [],
      });

      const result = await login({
        email: 'user@example.com',
        password: 'CorrectPass123!',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe('user@example.com');
      expect(result.user.role).toBe('developer');
      expect(result.user.teamId).toBe('team-uuid-5678');
    });

    it('should throw AppError 401 when email is not found', async () => {
      const mockQuery = vi.mocked(query);
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: '',
        oid: 0,
        fields: [],
      });

      await expect(
        login({ email: 'nonexistent@example.com', password: 'Password123!' }),
      ).rejects.toMatchObject({
        statusCode: 401,
        code: 'INVALID_CREDENTIALS',
      });
    });

    it('should throw AppError 401 when password does not match', async () => {
      const mockQuery = vi.mocked(query);
      const hashedPassword = await bcrypt.hash('CorrectPass123!', 10);

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'user-1',
            email: 'user@example.com',
            password_hash: hashedPassword,
            role: 'developer',
            team_id: null,
          },
        ],
        rowCount: 1,
        command: '',
        oid: 0,
        fields: [],
      });

      await expect(
        login({ email: 'user@example.com', password: 'WrongPassword!' }),
      ).rejects.toMatchObject({
        statusCode: 401,
        code: 'INVALID_CREDENTIALS',
      });
    });
  });

  describe('refreshAccessToken()', () => {
    it('should issue a new access token when a valid refresh token is supplied', async () => {
      const mockQuery = vi.mocked(query);
      const validPayload = {
        userId: 'u-123',
        email: 'test@example.com',
        role: 'developer',
        teamId: 't-456',
        tokenUse: 'refresh',
        jti: '11111111-1111-4111-8111-111111111111',
      };

      const refreshToken = jwt.sign(validPayload, config.jwt.privateKey, {
        algorithm: 'RS256', expiresIn: '7d',
      });

      // Load user, rotate the existing session, and persist the replacement session.
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'u-123', email: 'test@example.com', role: 'developer', team_id: 't-456' }],
        rowCount: 1,
        command: '',
        oid: 0,
        fields: [],
      });
      mockQuery.mockResolvedValueOnce({
        rows: [{ jti: validPayload.jti }], rowCount: 1, command: '', oid: 0, fields: [],
      });
      mockQuery.mockResolvedValueOnce({
        rows: [], rowCount: 1, command: '', oid: 0, fields: [],
      });

      const result = await refreshAccessToken(refreshToken);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      const decoded = jwt.verify(result.accessToken, config.jwt.publicKey, { algorithms: ['RS256'] }) as any;
      expect(decoded.userId).toBe('u-123');
      expect(decoded.email).toBe('test@example.com');
      expect(decoded.tokenUse).toBe('access');
    });

    it('should throw AppError 401 for an invalid or expired refresh token', async () => {
      await expect(refreshAccessToken('invalid-token-string')).rejects.toMatchObject({
        statusCode: 401,
        code: 'UNAUTHORIZED',
      });
    });

    it('should throw AppError 401 if user from valid token is no longer in database', async () => {
      const mockQuery = vi.mocked(query);
      const token = jwt.sign(
        { userId: 'deleted-user', email: 'del@example.com', role: 'developer', teamId: '', tokenUse: 'refresh', jti: '22222222-2222-4222-8222-222222222222' },
        config.jwt.privateKey,
        { algorithm: 'RS256', expiresIn: '1h' },
      );

      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: '',
        oid: 0,
        fields: [],
      });

      await expect(refreshAccessToken(token)).rejects.toMatchObject({
        statusCode: 401,
        code: 'UNAUTHORIZED',
      });
    });

    it('should reject a refresh token that has already been revoked or rotated', async () => {
      const token = jwt.sign(
        { userId: 'u-revoked', email: 'revoked@example.com', role: 'developer', teamId: '', tokenUse: 'refresh', jti: '33333333-3333-4333-8333-333333333333' },
        config.jwt.privateKey,
        { algorithm: 'RS256', expiresIn: '1h' },
      );

      const mockQuery = vi.mocked(query);
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'u-revoked', email: 'revoked@example.com', role: 'developer', team_id: null }],
        rowCount: 1, command: '', oid: 0, fields: [],
      });
      mockQuery.mockResolvedValueOnce({
        rows: [], rowCount: 0, command: '', oid: 0, fields: [],
      });

      await expect(refreshAccessToken(token)).rejects.toMatchObject({
        statusCode: 401,
        code: 'UNAUTHORIZED',
        message: 'Refresh token has already been used or revoked',
      });
    });
  });
});
