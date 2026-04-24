import { Controller, Get, Query, ParseIntPipe, ParseFloatPipe } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { LocationsService } from './locations.service';

@ApiTags('locations')
@Controller('locations')
export class LocationsController {
  constructor(private readonly service: LocationsService) {}

  @Get('nearest')
  @ApiOperation({ summary: 'Find nearest locations to given coordinates' })
  @ApiQuery({ name: 'lat', type: Number, example: 50.45 })
  @ApiQuery({ name: 'lon', type: Number, example: 30.52 })
  @ApiQuery({ name: 'limit', type: Number, required: false, example: 10 })
  findNearest(
    @Query('lat', ParseFloatPipe) lat: number,
    @Query('lon', ParseFloatPipe) lon: number,
    @Query('limit') limit = 10,
  ) {
    return this.service.findNearest(lat, lon, limit);
  }

  @Get('route')
  @ApiOperation({ summary: 'Get pre-calculated route and price between two locations' })
  @ApiQuery({ name: 'from', type: Number, example: 1 })
  @ApiQuery({ name: 'to', type: Number, example: 5 })
  getRoute(
    @Query('from', ParseIntPipe) fromId: number,
    @Query('to', ParseIntPipe) toId: number,
  ) {
    return this.service.getRoute(fromId, toId);
  }
}
