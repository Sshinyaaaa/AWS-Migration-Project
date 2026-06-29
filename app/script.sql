USE [master]
GO
/****** Object:  Database [AlumniDB]    Script Date: 5/12/2026 5:52:12 AM ******/
CREATE DATABASE [AlumniDB]
 CONTAINMENT = NONE
 ON  PRIMARY 
( NAME = N'AlumniDB', FILENAME = N'C:\Program Files\Microsoft SQL Server\MSSQL17.MSSQLSERVER01\MSSQL\DATA\AlumniDB.mdf' , SIZE = 8192KB , MAXSIZE = UNLIMITED, FILEGROWTH = 65536KB )
 LOG ON 
( NAME = N'AlumniDB_log', FILENAME = N'C:\Program Files\Microsoft SQL Server\MSSQL17.MSSQLSERVER01\MSSQL\DATA\AlumniDB_log.ldf' , SIZE = 8192KB , MAXSIZE = 2048GB , FILEGROWTH = 65536KB )
 WITH CATALOG_COLLATION = DATABASE_DEFAULT, LEDGER = OFF
GO
ALTER DATABASE [AlumniDB] SET COMPATIBILITY_LEVEL = 170
GO
IF (1 = FULLTEXTSERVICEPROPERTY('IsFullTextInstalled'))
begin
EXEC [AlumniDB].[dbo].[sp_fulltext_database] @action = 'enable'
end
GO
ALTER DATABASE [AlumniDB] SET ANSI_NULL_DEFAULT OFF 
GO
ALTER DATABASE [AlumniDB] SET ANSI_NULLS OFF 
GO
ALTER DATABASE [AlumniDB] SET ANSI_PADDING OFF 
GO
ALTER DATABASE [AlumniDB] SET ANSI_WARNINGS OFF 
GO
ALTER DATABASE [AlumniDB] SET ARITHABORT OFF 
GO
ALTER DATABASE [AlumniDB] SET AUTO_CLOSE OFF 
GO
ALTER DATABASE [AlumniDB] SET AUTO_SHRINK OFF 
GO
ALTER DATABASE [AlumniDB] SET AUTO_UPDATE_STATISTICS ON 
GO
ALTER DATABASE [AlumniDB] SET CURSOR_CLOSE_ON_COMMIT OFF 
GO
ALTER DATABASE [AlumniDB] SET CURSOR_DEFAULT  GLOBAL 
GO
ALTER DATABASE [AlumniDB] SET CONCAT_NULL_YIELDS_NULL OFF 
GO
ALTER DATABASE [AlumniDB] SET NUMERIC_ROUNDABORT OFF 
GO
ALTER DATABASE [AlumniDB] SET QUOTED_IDENTIFIER OFF 
GO
ALTER DATABASE [AlumniDB] SET RECURSIVE_TRIGGERS OFF 
GO
ALTER DATABASE [AlumniDB] SET  DISABLE_BROKER 
GO
ALTER DATABASE [AlumniDB] SET AUTO_UPDATE_STATISTICS_ASYNC OFF 
GO
ALTER DATABASE [AlumniDB] SET DATE_CORRELATION_OPTIMIZATION OFF 
GO
ALTER DATABASE [AlumniDB] SET TRUSTWORTHY OFF 
GO
ALTER DATABASE [AlumniDB] SET ALLOW_SNAPSHOT_ISOLATION OFF 
GO
ALTER DATABASE [AlumniDB] SET PARAMETERIZATION SIMPLE 
GO
ALTER DATABASE [AlumniDB] SET READ_COMMITTED_SNAPSHOT OFF 
GO
ALTER DATABASE [AlumniDB] SET HONOR_BROKER_PRIORITY OFF 
GO
ALTER DATABASE [AlumniDB] SET RECOVERY FULL 
GO
ALTER DATABASE [AlumniDB] SET  MULTI_USER 
GO
ALTER DATABASE [AlumniDB] SET PAGE_VERIFY CHECKSUM  
GO
ALTER DATABASE [AlumniDB] SET DB_CHAINING OFF 
GO
ALTER DATABASE [AlumniDB] SET FILESTREAM( NON_TRANSACTED_ACCESS = OFF ) 
GO
ALTER DATABASE [AlumniDB] SET TARGET_RECOVERY_TIME = 60 SECONDS 
GO
ALTER DATABASE [AlumniDB] SET DELAYED_DURABILITY = DISABLED 
GO
ALTER DATABASE [AlumniDB] SET OPTIMIZED_LOCKING = OFF 
GO
ALTER DATABASE [AlumniDB] SET ACCELERATED_DATABASE_RECOVERY = OFF  
GO
ALTER DATABASE [AlumniDB] SET QUERY_STORE = ON
GO
ALTER DATABASE [AlumniDB] SET QUERY_STORE (OPERATION_MODE = READ_WRITE, CLEANUP_POLICY = (STALE_QUERY_THRESHOLD_DAYS = 30), DATA_FLUSH_INTERVAL_SECONDS = 900, INTERVAL_LENGTH_MINUTES = 60, MAX_STORAGE_SIZE_MB = 1000, QUERY_CAPTURE_MODE = AUTO, SIZE_BASED_CLEANUP_MODE = AUTO, MAX_PLANS_PER_QUERY = 200, WAIT_STATS_CAPTURE_MODE = ON)
GO
USE [AlumniDB]
GO
/****** Object:  User [AlumniAppUser]    Script Date: 5/12/2026 5:52:13 AM ******/
CREATE USER [AlumniAppUser] FOR LOGIN [AlumniAppUser] WITH DEFAULT_SCHEMA=[dbo]
GO
ALTER ROLE [db_datareader] ADD MEMBER [AlumniAppUser]
GO
ALTER ROLE [db_datawriter] ADD MEMBER [AlumniAppUser]
GO
/****** Object:  Table [dbo].[Alumni]    Script Date: 5/12/2026 5:52:13 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Alumni](
	[alumni_id] [bigint] NOT NULL,
	[user_id] [bigint] NULL,
	[full_name] [varchar](255) NOT NULL,
	[batch_year] [int] NOT NULL,
	[programme] [varchar](255) NULL,
	[phone] [varchar](50) MASKED WITH (FUNCTION = 'partial(3, "-XXX-", 4)') NULL,
	[nric_encrypted] [varchar](255) MASKED WITH (FUNCTION = 'default()') NULL,
	[address_encrypted] [varchar](max) NULL,
	[updated_at] [datetime] NULL,
PRIMARY KEY CLUSTERED 
(
	[alumni_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[AuditLogs]    Script Date: 5/12/2026 5:52:13 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[AuditLogs](
	[log_id] [bigint] NOT NULL,
	[table_name] [varchar](100) NULL,
	[action_type] [varchar](50) NULL,
	[record_id] [bigint] NULL,
	[changed_by] [bigint] NULL,
	[new_value] [varchar](max) NULL,
	[changed_at] [datetime] NULL,
	[ip_address] [varchar](50) NULL,
PRIMARY KEY CLUSTERED 
(
	[log_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Donations]    Script Date: 5/12/2026 5:52:13 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Donations](
	[donation_id] [bigint] NOT NULL,
	[alumni_id] [bigint] NULL,
	[amount] [decimal](10, 2) NOT NULL,
	[message] [varchar](max) NULL,
	[donated_at] [datetime] NULL,
	[receipt_ref] [varchar](100) NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[donation_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Users]    Script Date: 5/12/2026 5:52:13 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Users](
	[user_id] [bigint] NOT NULL,
	[email] [varchar](255) MASKED WITH (FUNCTION = 'email()') NOT NULL,
	[password_hash] [varchar](255) NOT NULL,
	[role] [varchar](50) NULL,
	[is_active] [int] NULL,
	[created_at] [datetime] NULL,
PRIMARY KEY CLUSTERED 
(
	[user_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
INSERT [dbo].[Alumni] ([alumni_id], [user_id], [full_name], [batch_year], [programme], [phone], [nric_encrypted], [address_encrypted], [updated_at]) VALUES (1, 1, N'JACOB', 2022, N'Bachelor of Computer Science', NULL, NULL, NULL, CAST(N'2026-05-12T03:02:48.543' AS DateTime))
INSERT [dbo].[Alumni] ([alumni_id], [user_id], [full_name], [batch_year], [programme], [phone], [nric_encrypted], [address_encrypted], [updated_at]) VALUES (1778526301908, 1778526301907, N'123', 1990, N'Bachelor of Computer Science (Software Engineering)', N'0102501215', N'encrypted_data_placeholder', N'encrypted_data_placeholder', CAST(N'2026-05-11T19:05:01.907' AS DateTime))
INSERT [dbo].[Alumni] ([alumni_id], [user_id], [full_name], [batch_year], [programme], [phone], [nric_encrypted], [address_encrypted], [updated_at]) VALUES (1778527797799, 1778527797798, N'bangchan', 1990, N'Bachelor of Software Engineering', N'0102501215', N'encrypted_data_placeholder', N'encrypted_data_placeholder', CAST(N'2026-05-11T19:29:57.797' AS DateTime))
GO
INSERT [dbo].[AuditLogs] ([log_id], [table_name], [action_type], [record_id], [changed_by], [new_value], [changed_at], [ip_address]) VALUES (1, N'ALUMNI', N'INSERT', 1, 1, N'New Record Added', CAST(N'2026-05-12T03:54:42.007' AS DateTime), N'192.168.0.1')
INSERT [dbo].[AuditLogs] ([log_id], [table_name], [action_type], [record_id], [changed_by], [new_value], [changed_at], [ip_address]) VALUES (1778533689156, N'USERS/ALUMNI', N'UPDATE_PROFILE', 1778526301907, 1778526301907, N'Name: 1234, Email: shinya@mao.com', CAST(N'2026-05-11T21:08:09.153' AS DateTime), N'127.0.0.1')
INSERT [dbo].[AuditLogs] ([log_id], [table_name], [action_type], [record_id], [changed_by], [new_value], [changed_at], [ip_address]) VALUES (1778533694642, N'USERS/ALUMNI', N'UPDATE_PROFILE', 1778526301907, 1778526301907, N'Name: maomaochong, Email: shinya@mao.com', CAST(N'2026-05-11T21:08:14.640' AS DateTime), N'127.0.0.1')
INSERT [dbo].[AuditLogs] ([log_id], [table_name], [action_type], [record_id], [changed_by], [new_value], [changed_at], [ip_address]) VALUES (1778533739926, N'USERS/ALUMNI', N'UPDATE_PROFILE', 1778526301907, 1778526301907, N'Name: maomaochong, Email: shinya@mao.com', CAST(N'2026-05-11T21:08:59.923' AS DateTime), N'127.0.0.1')
INSERT [dbo].[AuditLogs] ([log_id], [table_name], [action_type], [record_id], [changed_by], [new_value], [changed_at], [ip_address]) VALUES (1778533743335, N'USERS/ALUMNI', N'UPDATE_PROFILE', 1778526301907, 1778526301907, N'Name: maomaochong, Email: shinya@mao.com', CAST(N'2026-05-11T21:09:03.333' AS DateTime), N'127.0.0.1')
INSERT [dbo].[AuditLogs] ([log_id], [table_name], [action_type], [record_id], [changed_by], [new_value], [changed_at], [ip_address]) VALUES (1778533743983, N'USERS/ALUMNI', N'UPDATE_PROFILE', 1778526301907, 1778526301907, N'Name: maomaochong, Email: shinya@mao.com', CAST(N'2026-05-11T21:09:03.980' AS DateTime), N'127.0.0.1')
INSERT [dbo].[AuditLogs] ([log_id], [table_name], [action_type], [record_id], [changed_by], [new_value], [changed_at], [ip_address]) VALUES (1778533747281, N'USERS/ALUMNI', N'UPDATE_PROFILE', 1778526301907, 1778526301907, N'Name: maomaochong, Email: shinya@mao.com', CAST(N'2026-05-11T21:09:07.280' AS DateTime), N'127.0.0.1')
INSERT [dbo].[AuditLogs] ([log_id], [table_name], [action_type], [record_id], [changed_by], [new_value], [changed_at], [ip_address]) VALUES (1778533785139, N'USERS/ALUMNI', N'UPDATE_PROFILE', 1778526301907, 1778526301907, N'Name: 123, Email: shinya@mao.com', CAST(N'2026-05-11T21:09:45.137' AS DateTime), N'127.0.0.1')
INSERT [dbo].[AuditLogs] ([log_id], [table_name], [action_type], [record_id], [changed_by], [new_value], [changed_at], [ip_address]) VALUES (1778533785279, N'USERS', N'UPDATE_PASSWORD', 1778526301907, 1778526301907, N'Password Hash Rotated', CAST(N'2026-05-11T21:09:45.277' AS DateTime), N'127.0.0.1')
GO
INSERT [dbo].[Donations] ([donation_id], [alumni_id], [amount], [message], [donated_at], [receipt_ref]) VALUES (1715480000000, 1, CAST(150.00 AS Decimal(10, 2)), N'For the new tech lab', CAST(N'2026-05-12T04:14:55.013' AS DateTime), N'MMU-X9Y8Z7W6')
GO
INSERT [dbo].[Users] ([user_id], [email], [password_hash], [role], [is_active], [created_at]) VALUES (1, N'cemex74686@deapad.com', N'0x243...', N'alumni', 1, CAST(N'2026-05-12T03:02:48.493' AS DateTime))
INSERT [dbo].[Users] ([user_id], [email], [password_hash], [role], [is_active], [created_at]) VALUES (1778526301907, N'shinya@mao.com', N'$2b$10$Kc3eUY2xl8rxxlKVKbQkO.4uYhJL8kYfcTm9fLy14OuEVxaT/yKai', N'admin', 1, CAST(N'2026-05-11T19:05:01.907' AS DateTime))
INSERT [dbo].[Users] ([user_id], [email], [password_hash], [role], [is_active], [created_at]) VALUES (1778527797798, N'dude@dude.com', N'$2b$10$1N0FXUVCMsoxfDYAOI2mmeRk96VtsRJFOIlx920n5AyAJi2kTIP.K', N'alumni', 1, CAST(N'2026-05-11T19:29:57.797' AS DateTime))
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [UQ__Donation__9EF90617D8875D61]    Script Date: 5/12/2026 5:52:13 AM ******/
ALTER TABLE [dbo].[Donations] ADD UNIQUE NONCLUSTERED 
(
	[receipt_ref] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [UQ__Users__AB6E6164DC31F075]    Script Date: 5/12/2026 5:52:13 AM ******/
ALTER TABLE [dbo].[Users] ADD UNIQUE NONCLUSTERED 
(
	[email] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
ALTER TABLE [dbo].[Alumni] ADD  DEFAULT (getdate()) FOR [updated_at]
GO
ALTER TABLE [dbo].[AuditLogs] ADD  DEFAULT (getdate()) FOR [changed_at]
GO
ALTER TABLE [dbo].[Donations] ADD  DEFAULT (getdate()) FOR [donated_at]
GO
ALTER TABLE [dbo].[Users] ADD  DEFAULT ('alumni') FOR [role]
GO
ALTER TABLE [dbo].[Users] ADD  DEFAULT ((1)) FOR [is_active]
GO
ALTER TABLE [dbo].[Users] ADD  DEFAULT (getdate()) FOR [created_at]
GO
ALTER TABLE [dbo].[Alumni]  WITH CHECK ADD FOREIGN KEY([user_id])
REFERENCES [dbo].[Users] ([user_id])
GO
ALTER TABLE [dbo].[Donations]  WITH CHECK ADD FOREIGN KEY([alumni_id])
REFERENCES [dbo].[Alumni] ([alumni_id])
GO
USE [master]
GO
ALTER DATABASE [AlumniDB] SET  READ_WRITE 
GO
